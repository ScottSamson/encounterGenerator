#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { EncounterGeneratorApiStack } from "../lib/api-stack";
import { EncounterGeneratorCicdStack } from "../lib/cicd-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-west-2",
};

// CI/CD bootstrap: GitHub OIDC provider + the IAM role the workflows assume. Deployed
// once, manually, by an admin with local credentials.
new EncounterGeneratorCicdStack(app, "EncounterGeneratorCicdStack", {
  env,
  githubOwner: app.node.tryGetContext("githubOwner") ?? "ScottSamson",
  githubRepo: app.node.tryGetContext("githubRepo") ?? "encounterGenerator",
  // Numeric IDs GitHub embeds in this account's customised OIDC `sub` claim.
  githubOwnerId: app.node.tryGetContext("githubOwnerId") ?? "5559136",
  githubRepoId: app.node.tryGetContext("githubRepoId") ?? "1314211234",
  // Set `-c createOidcProvider=false` if the account already has the GitHub OIDC provider.
  createOidcProvider: app.node.tryGetContext("createOidcProvider") !== "false",
});

// One API stack per environment. Deploy a specific one by stack id, e.g.
// `cdk deploy EncounterGeneratorApiStack-stage`.
for (const envName of ["stage", "prod"] as const) {
  new EncounterGeneratorApiStack(app, `EncounterGeneratorApiStack-${envName}`, {
    env,
    envName,
  });
}
