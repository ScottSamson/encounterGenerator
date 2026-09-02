import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";

export type ApiEnvName = "stage" | "prod";

export interface EncounterGeneratorApiStackProps extends cdk.StackProps {
  readonly envName: ApiEnvName;
}

// Built by `npm run package:lambda` in ../../../api before every deploy / synth.
const LAMBDA_ZIP = path.join(__dirname, "..", "..", "..", "api", "lambda.zip");

export class EncounterGeneratorApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EncounterGeneratorApiStackProps) {
    super(scope, id, props);

    const { envName } = props;
    const ssmPrefix = `/encounter-generator/${envName}/api`;
    const fnName = `encounter-generator-api-${envName}`;

    // Dedicated VPC, public subnets only, no NAT gateways -> no hourly cost.
    //
    // NOTE: a Lambda ENI in a public subnet still gets no public IP and therefore no
    // route to the internet, so this does NOT give the function egress to MongoDB Atlas.
    // Outbound connectivity (NAT gateway or a VPC endpoint / PrivateLink path) is a
    // deliberate later step — see infrastructure/cdk/README.md.
    const vpc = new ec2.Vpc(this, "ApiVpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
      ],
    });

    const lambdaSg = new ec2.SecurityGroup(this, "LambdaSg", {
      vpc,
      description: `${fnName} Lambda`,
      allowAllOutbound: true,
    });

    const logGroup = new logs.LogGroup(this, "ApiFnLogs", {
      logGroupName: `/aws/lambda/${fnName}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const fn = new lambda.Function(this, "ApiFn", {
      functionName: fnName,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "dist/lambda.handler",
      code: lambda.Code.fromAsset(LAMBDA_ZIP),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      logGroup,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [lambdaSg],
      allowPublicSubnet: true,
      environment: {
        SSM_PARAM_PREFIX: ssmPrefix,
        NODE_OPTIONS: "--enable-source-maps",
      },
    });

    // Read + decrypt the DB config seeded manually under the SSM prefix (see README).
    const paramArns = [
      cdk.Arn.format(
        { service: "ssm", resource: "parameter", resourceName: ssmPrefix.replace(/^\//, "") },
        this,
      ),
      cdk.Arn.format(
        { service: "ssm", resource: "parameter", resourceName: `${ssmPrefix.replace(/^\//, "")}/*` },
        this,
      ),
    ];
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParametersByPath", "ssm:GetParameters", "ssm:GetParameter"],
        resources: paramArns,
      }),
    );
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        // AWS-managed key for SSM SecureString. Constrained to SSM-initiated decrypts.
        actions: ["kms:Decrypt"],
        resources: ["*"],
        conditions: {
          StringEquals: { "kms:ViaService": `ssm.${this.region}.amazonaws.com` },
        },
      }),
    );

    // IAM-authed for now (matches the current CloudFront-OAC model). Nothing calls it
    // until the Cloudflare-hosted web front-end is wired up.
    const fnUrl = fn.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.AWS_IAM });

    // Least-privilege policy for calling the Function URL with SigV4 (Postman, awscurl,
    // a future backend caller). Attach to whichever user/role needs it, e.g.
    //   aws iam attach-user-policy --user-name <you> --policy-arn <InvokeUrlPolicyArn>
    // No `lambda:FunctionUrlAuthType` condition — the live InvokeFunctionUrl request
    // does not reliably carry that context key, so a StringEquals on it denies the call.
    const invokeUrlPolicy = new iam.ManagedPolicy(this, "InvokeUrlPolicy", {
      managedPolicyName: `${fnName}-invoke-url`,
      description: `Invoke the ${fnName} Function URL (SigV4 / AWS_IAM auth)`,
      statements: [
        new iam.PolicyStatement({
          actions: ["lambda:InvokeFunctionUrl", "lambda:InvokeFunction"],
          resources: [fn.functionArn],
        }),
      ],
    });

    new cdk.CfnOutput(this, "FunctionName", { value: fn.functionName });
    new cdk.CfnOutput(this, "FunctionUrl", { value: fnUrl.url });
    new cdk.CfnOutput(this, "InvokeUrlPolicyArn", { value: invokeUrlPolicy.managedPolicyArn });
    new cdk.CfnOutput(this, "VpcId", { value: vpc.vpcId });
    new cdk.CfnOutput(this, "LambdaSecurityGroupId", { value: lambdaSg.securityGroupId });
  }
}
