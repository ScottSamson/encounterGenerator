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

    // Dedicated VPC: public subnets for the NAT instance, private subnets for the Lambda.
    //
    // Outbound internet (SSM Parameter Store + MongoDB Atlas) goes Lambda -> private
    // subnet route -> a single t4g.nano NAT instance in a public subnet -> IGW. An
    // Elastic IP is pinned to that instance so Atlas Network Access can allowlist one
    // fixed address per environment. One NAT instance instead of a NAT gateway (~$32/mo
    // -> ~$4/mo). Single-AZ egress: if the NAT instance is down, the API has no DB
    // connectivity. Stage's NAT can be stopped when idle — see infrastructure/cdk/README.md.
    const natProvider = ec2.NatProvider.instanceV2({
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      defaultAllowedTraffic: ec2.NatTrafficDirection.OUTBOUND_ONLY,
    });

    const vpc = new ec2.Vpc(this, "ApiVpc", {
      maxAzs: 2,
      natGateways: 1,
      natGatewayProvider: natProvider,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: "private", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
      ],
    });

    // Let every subnet in the VPC route out through the NAT instance.
    natProvider.securityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.allTraffic(),
      "VPC egress via NAT instance",
    );

    // Fixed egress address to allowlist in MongoDB Atlas (per environment).
    const natEip = new ec2.CfnEIP(this, "NatEip", {
      domain: "vpc",
      tags: [{ key: "Name", value: `${fnName}-nat` }],
    });
    const natInstanceId = natProvider.configuredGateways[0]!.gatewayId;
    new ec2.CfnEIPAssociation(this, "NatEipAssoc", {
      allocationId: natEip.attrAllocationId,
      instanceId: natInstanceId,
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
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSg],
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

    // Policy for calling the Function URL with SigV4 (Postman, awscurl, a future backend
    // caller). Attach to whichever user/role needs it, e.g.
    //   aws iam attach-user-policy --user-name <you> --policy-arn <InvokeUrlPolicyArn>
    // Function URLs created after October 2025 require BOTH lambda:InvokeFunctionUrl and
    // lambda:InvokeFunction in the caller's identity policy — docs: lambda/latest/dg/urls-auth.html.
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
    new cdk.CfnOutput(this, "EgressStaticIp", {
      value: natEip.ref,
      description: "Add this to MongoDB Atlas Network Access as <ip>/32",
    });
    new cdk.CfnOutput(this, "NatInstanceId", {
      value: natInstanceId,
      description: "Stop/start to toggle this environment's outbound egress (see README)",
    });
    new cdk.CfnOutput(this, "VpcId", { value: vpc.vpcId });
    new cdk.CfnOutput(this, "LambdaSecurityGroupId", { value: lambdaSg.securityGroupId });
  }
}
