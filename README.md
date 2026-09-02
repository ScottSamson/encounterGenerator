# D&D Encounter Generator

A small app for generating balanced D&D encounters. Two parts:

- **`web/`** — Next.js 16 app, statically exported (`output: 'export'`), fully client-side.
- **`api/`** — Express 5 + MongoDB Atlas API, deployable both as a normal Node server and as an AWS Lambda function.

## Local development

```bash
# API (http://localhost:3000)
cd api
npm install
npm run dev

# Web (http://localhost:3001)
cd web
npm install
npm run dev
```

`web/.env.local` (gitignored) points local dev at the local API:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

`api/.env` (gitignored) holds `DB_CONN_STRING`, `DB_NAME`, `MONSTERS_COLLECTION_NAME`, `XPTHRESHOLDS_COLLECTION_NAME`.

## Production architecture

One CloudFront distribution, two origins:

- Default behavior → **S3** bucket (the static `web/out/` build)
- `/api/*` behavior → **Lambda Function URL** (the API, via `@codegenie/serverless-express`)

Same-origin under one CloudFront domain, so there's no CORS to deal with in production, no API Gateway, and no custom domain. Cost is ~$0/month at hobby traffic — CloudFront's and Lambda's free tiers are both perpetual, not 12-month trials.

## Deployment runbook

> **Superseded for the API.** The API is now deployed by the CDK app in
> [`infrastructure/cdk/`](infrastructure/cdk/README.md) (Lambda in a VPC) via GitHub
> Actions. The steps below remain only as the reference for the CloudFront + S3 web
> path, which is itself being retired in favour of Cloudflare.

Reusable IAM/CloudFront JSON templates live in `infrastructure/` — `*.template.json` files have `${VAR}` placeholders filled in via `sed` at deploy time (see below). For the Lambda execution role's trust policy, use this inline (CDK now manages that role for the real deployments):

```json
{ "Version": "2012-10-17", "Statement": [{ "Effect": "Allow", "Principal": { "Service": "lambda.amazonaws.com" }, "Action": "sts:AssumeRole" }] }
```

`github-deploy-role-trust-policy.template.json` is the trust policy for the GitHub Actions OIDC deploy role — fill `${ACCOUNT_ID}` and apply with `aws iam update-assume-role-policy` if you need to repair the live role without a `cdk deploy`.

### Prerequisites (one-time)

```bash
brew install awscli jq
aws configure   # IAM user credentials, region: us-west-2
```

Shared variables for every step below (reuse in the same terminal session — exported vars don't survive across tabs/windows):
```bash
export AWS_REGION=us-west-2
export BUCKET_NAME=dnd-encounter-generator-web
export FUNCTION_NAME=dnd-encounter-generator-api
export ROLE_NAME=dnd-encounter-generator-api-role
```

### 1. S3 bucket (private, no website hosting)
```bash
aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint=$AWS_REGION

aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 2. Build and upload the static site
```bash
cd web
rm -f .env.local
NEXT_PUBLIC_API_URL= npm run build
cd ..

aws s3 sync web/out "s3://$BUCKET_NAME" --delete
```
Recreate `.env.local` afterward for local dev: `echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > web/.env.local`.

### 3. IAM role for Lambda
```bash
aws iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

sleep 10   # let the role propagate
export ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
```

### 4. Package and create the Lambda function
```bash
cd api
npm run package:lambda   # produces api/lambda.zip
cd ..
```
Create `/tmp/lambda-env.json` yourself from your real `api/.env` values (never commit this file, never paste secrets into a shared doc):
```json
{
  "Variables": {
    "DB_CONN_STRING": "<value>",
    "DB_NAME": "<value>",
    "MONSTERS_COLLECTION_NAME": "<value>",
    "XPTHRESHOLDS_COLLECTION_NAME": "<value>"
  }
}
```
```bash
aws lambda create-function \
  --function-name "$FUNCTION_NAME" \
  --runtime nodejs22.x \
  --architectures arm64 \
  --handler dist/lambda.handler \
  --role "$ROLE_ARN" \
  --timeout 10 \
  --memory-size 256 \
  --zip-file fileb://api/lambda.zip \
  --environment file:///tmp/lambda-env.json
```

### 5. Function URL (IAM-authenticated, not public)
```bash
aws lambda create-function-url-config \
  --function-name "$FUNCTION_NAME" \
  --auth-type AWS_IAM

export FUNCTION_URL=$(aws lambda get-function-url-config --function-name "$FUNCTION_NAME" --query 'FunctionUrl' --output text)
export LAMBDA_ORIGIN_DOMAIN=$(echo "$FUNCTION_URL" | sed -E 's#https://##; s#/$##')
```

### 6. Two Origin Access Controls
```bash
aws cloudfront create-origin-access-control \
  --origin-access-control-config \
  Name=dnd-eg-s3-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3 \
  > /tmp/s3-oac.json
export S3_OAC_ID=$(jq -r '.OriginAccessControl.Id' /tmp/s3-oac.json)

aws cloudfront create-origin-access-control \
  --origin-access-control-config \
  Name=dnd-eg-lambda-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=lambda \
  > /tmp/lambda-oac.json
export LAMBDA_OAC_ID=$(jq -r '.OriginAccessControl.Id' /tmp/lambda-oac.json)
```

### 7. CloudFront distribution

Fill in the template's placeholders with `sed` (avoids pasting a large heredoc into your terminal, which is what caused paste corruption the first time this was set up):
```bash
sed \
  -e "s|\${TIMESTAMP}|$(date +%s)|g" \
  -e "s|\${BUCKET_NAME}|$BUCKET_NAME|g" \
  -e "s|\${AWS_REGION}|$AWS_REGION|g" \
  -e "s|\${S3_OAC_ID}|$S3_OAC_ID|g" \
  -e "s|\${LAMBDA_OAC_ID}|$LAMBDA_OAC_ID|g" \
  -e "s|\${LAMBDA_ORIGIN_DOMAIN}|$LAMBDA_ORIGIN_DOMAIN|g" \
  infrastructure/cf-distribution-config.template.json > /tmp/cf-distribution-config.json

jq . /tmp/cf-distribution-config.json > /dev/null && echo "Valid JSON"   # sanity check before creating anything

aws cloudfront create-distribution \
  --distribution-config file:///tmp/cf-distribution-config.json \
  > /tmp/cf-create-output.json

export DISTRIBUTION_ID=$(jq -r '.Distribution.Id' /tmp/cf-create-output.json)
export DISTRIBUTION_ARN=$(jq -r '.Distribution.ARN' /tmp/cf-create-output.json)
export DISTRIBUTION_DOMAIN=$(jq -r '.Distribution.DomainName' /tmp/cf-create-output.json)
```

### 8. Permissions: CloudFront → Lambda, CloudFront → S3

**Both of the following `add-permission` calls are required** — one action alone isn't enough for CloudFront's OAC-signed requests to a Function URL to be authorized. Missing the second one produces a confusing symptom: the resource policy looks completely correct, but CloudFront requests still get `403`ed before your function ever runs.
```bash
aws lambda add-permission \
  --statement-id "AllowCloudFrontServicePrincipal" \
  --action "lambda:InvokeFunctionUrl" \
  --principal "cloudfront.amazonaws.com" \
  --source-arn "$DISTRIBUTION_ARN" \
  --function-name "$FUNCTION_NAME"

aws lambda add-permission \
  --statement-id "AllowCloudFrontServicePrincipalInvokeFunction" \
  --action "lambda:InvokeFunction" \
  --principal "cloudfront.amazonaws.com" \
  --source-arn "$DISTRIBUTION_ARN" \
  --function-name "$FUNCTION_NAME"
```

S3 bucket policy (scoped to this distribution only):
```bash
sed \
  -e "s|\${BUCKET_NAME}|$BUCKET_NAME|g" \
  -e "s|\${DISTRIBUTION_ARN}|$DISTRIBUTION_ARN|g" \
  infrastructure/s3-bucket-policy.template.json > /tmp/s3-bucket-policy.json

aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/s3-bucket-policy.json
```

### 9. Wait and test
```bash
aws cloudfront wait distribution-deployed --id "$DISTRIBUTION_ID"   # 5-15 min

curl -s "https://$DISTRIBUTION_DOMAIN/" | head -20
curl -s "https://$DISTRIBUTION_DOMAIN/api/encounters/generate?partySize=4&avgPlayerLevel=1"
```

### 10. Manual step — outside AWS
In MongoDB Atlas → Network Access, add `0.0.0.0/0`. Lambda (no VPC — a NAT Gateway for a fixed outbound IP would cost ~$32-33/month, breaking the "cheap" goal) has no fixed outbound IP, so Atlas must allow all IPs. Auth is still enforced via the DB user/password in the connection string.

## Redeploying

**Web changes:**
```bash
cd web
rm -f .env.local
NEXT_PUBLIC_API_URL= npm run build
cd ..
aws s3 sync web/out "s3://$BUCKET_NAME" --delete
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths '/*'
```

**API changes:**
```bash
cd api
npm run package:lambda
cd ..
aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file fileb://api/lambda.zip
```
No CloudFront invalidation needed — `/api/*` uses the `CachingDisabled` managed policy.

**Env var changes** (e.g. rotating the Atlas connection string): regenerate `/tmp/lambda-env.json`, then:
```bash
aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --environment file:///tmp/lambda-env.json
```

## Testing the Lambda handler locally

```bash
cd api
npm run test:lambda-invoke   # invokes handler() in-process with a synthetic Function URL event
```
