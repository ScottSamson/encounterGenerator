import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export interface EncounterGeneratorCicdStackProps extends cdk.StackProps {
  readonly githubOwner: string;
  readonly githubRepo: string;
  /**
   * Immutable numeric IDs GitHub embeds in this account's customised OIDC `sub` claim
   * (`repo:<owner>@<ownerId>/<repo>@<repoId>:...`). Found via CloudTrail on a failed
   * AssumeRoleWithWebIdentity, or `gh api /repos/<owner>/<repo> --jq '.id, .owner.id'`.
   */
  readonly githubOwnerId: string;
  readonly githubRepoId: string;
  /** Create the GitHub OIDC provider. Set false if the account already has one. */
  readonly createOidcProvider?: boolean;
  /**
   * Optional extra tightening: OIDC `sub` claims allowed to assume the deploy role,
   * ANDed with the `repository` check below. Leave unset to allow any workflow in the
   * repo (prod is still protected by the GitHub Environment reviewer gate).
   *
   * NOTE: this account customises the `sub` claim to carry immutable numeric IDs, e.g.
   * `repo:ScottSamson@5559136/encounterGenerator@1314211234:environment:prod` — match
   * that exact shape, not the plain `repo:owner/name:...` form.
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

    const { githubOwner, githubRepo, githubOwnerId, githubRepoId, createOidcProvider = true } = props;

    // This account customises the OIDC `sub` claim to carry immutable numeric IDs, e.g.
    // `repo:ScottSamson@5559136/encounterGenerator@1314211234:environment:stage`.
    const repoSubjectPrefix = `repo:${githubOwner}@${githubOwnerId}/${githubRepo}@${githubRepoId}`;

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

    // AWS requires a non-wildcard `sub` (or `job_workflow_ref`) condition, so we can't
    // gate on `repository` alone. Default: any workflow in this repo (prod is protected
    // by the GitHub Environment reviewer gate). Override `githubSubjectClaims` to pin
    // specific environments/branches — full `sub` strings, ID-augmented form.
    const subjectClaims = props.githubSubjectClaims ?? [`${repoSubjectPrefix}:*`];
    const conditions: Record<string, Record<string, string | string[]>> = {
      StringEquals: {
        [`${GITHUB_OIDC_DOMAIN}:aud`]: "sts.amazonaws.com",
        [`${GITHUB_OIDC_DOMAIN}:repository`]: `${githubOwner}/${githubRepo}`,
      },
      StringLike: { [`${GITHUB_OIDC_DOMAIN}:sub`]: subjectClaims },
    };

    // Built explicitly (not via WebIdentityPrincipal) so the trust policy action and
    // conditions are unambiguous in `cdk synth` and in the deployed role.
    const trustPrincipal = new iam.FederatedPrincipal(
      provider.openIdConnectProviderArn,
      conditions,
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
