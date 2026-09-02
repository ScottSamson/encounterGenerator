import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export interface EncounterGeneratorCicdStackProps extends cdk.StackProps {
  readonly githubOwner: string;
  readonly githubRepo: string;
  /** Create the GitHub OIDC provider. Set false if the account already has one. */
  readonly createOidcProvider?: boolean;
  /**
   * OIDC `sub` claims allowed to assume the deploy role. Defaults to the two deploy
   * environments plus the two deploy branches, so the role is assumable whether or not
   * GitHub attaches the `environment:` form of the claim to a given run. All entries are
   * still scoped to this one repo. Tighten to just `:environment:prod` etc. once the
   * pipeline is proven.
   */
  readonly githubSubjectClaims?: string[];
}

const GITHUB_OIDC_DOMAIN = "token.actions.githubusercontent.com";
const WEB_IDENTITY_ACTION = "sts:AssumeRoleWithWebIdentity";

// GitHub OIDC provider + the IAM role the deploy workflows assume. Deployed once,
// manually, by an admin with local credentials. The workflows only need to assume the
// CDK bootstrap roles; CloudFormation does the real resource work under the
// cfn-exec role.
export class EncounterGeneratorCicdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EncounterGeneratorCicdStackProps) {
    super(scope, id, props);

    const { githubOwner, githubRepo, createOidcProvider = true } = props;

    const provider = createOidcProvider
      ? new iam.OpenIdConnectProvider(this, "GitHubOidc", {
          url: `https://${GITHUB_OIDC_DOMAIN}`,
          clientIds: ["sts.amazonaws.com"],
        })
      : iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
          this,
          "GitHubOidc",
          cdk.Arn.format(
            { service: "iam", region: "", resource: "oidc-provider", resourceName: GITHUB_OIDC_DOMAIN },
            this,
          ),
        );

    const subjectClaims = props.githubSubjectClaims ?? [
      `repo:${githubOwner}/${githubRepo}:environment:stage`,
      `repo:${githubOwner}/${githubRepo}:environment:prod`,
      `repo:${githubOwner}/${githubRepo}:ref:refs/heads/development`,
      `repo:${githubOwner}/${githubRepo}:ref:refs/heads/main`,
    ];

    // Built explicitly (not via WebIdentityPrincipal) so the trust policy action and
    // conditions are unambiguous in `cdk synth` and in the deployed role.
    const trustPrincipal = new iam.FederatedPrincipal(
      provider.openIdConnectProviderArn,
      {
        StringEquals: { [`${GITHUB_OIDC_DOMAIN}:aud`]: "sts.amazonaws.com" },
        StringLike: { [`${GITHUB_OIDC_DOMAIN}:sub`]: subjectClaims },
      },
      WEB_IDENTITY_ACTION,
    );

    const deployRole = new iam.Role(this, "DeployRole", {
      roleName: "github-deploy-encounter-generator-api",
      description:
        "Assumed by GitHub Actions (OIDC) to deploy the encounter-generator API stacks via CDK",
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: trustPrincipal,
    });

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AssumeCdkBootstrapRoles",
        actions: ["sts:AssumeRole"],
        resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
      }),
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "ReadStackState",
        actions: ["cloudformation:DescribeStacks"],
        resources: ["*"],
      }),
    );

    new cdk.CfnOutput(this, "DeployRoleArn", {
      value: deployRole.roleArn,
      description: "Set this as the GitHub repo variable AWS_DEPLOY_ROLE_ARN",
    });
    new cdk.CfnOutput(this, "OidcProviderArn", {
      value: provider.openIdConnectProviderArn,
    });
  }
}
