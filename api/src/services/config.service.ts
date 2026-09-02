// Loads the database configuration from AWS SSM Parameter Store when the API runs in
// Lambda. The four parameters (DB_CONN_STRING as a SecureString, the rest as String)
// are seeded manually once per environment under SSM_PARAM_PREFIX — see
// infrastructure/cdk/README.md. Locally, config still comes from api/.env via dotenv.
//
// IO-only glue: excluded from unit-test coverage (see jest.config.cjs) and exercised by
// the post-deploy smoke test instead.

const PARAM_KEYS = [
  "DB_CONN_STRING",
  "DB_NAME",
  "MONSTERS_COLLECTION_NAME",
  "XPTHRESHOLDS_COLLECTION_NAME",
] as const;

export async function loadConfigFromSsmIfConfigured(): Promise<void> {
  const prefix = process.env.SSM_PARAM_PREFIX;
  // Nothing to do for local dev / tests, or when the values are already present.
  if (!prefix || process.env.DB_CONN_STRING) {
    return;
  }

  // Imported lazily so local dev and the test suite never need the AWS SDK on the path.
  const { SSMClient, GetParametersByPathCommand } = await import("@aws-sdk/client-ssm");
  const client = new SSMClient({});

  let nextToken: string | undefined;
  do {
    const res = await client.send(
      new GetParametersByPathCommand({
        Path: prefix,
        Recursive: true,
        WithDecryption: true,
        NextToken: nextToken,
      }),
    );
    for (const param of res.Parameters ?? []) {
      const key = param.Name?.split("/").pop();
      if (key && (PARAM_KEYS as readonly string[]).includes(key) && param.Value !== undefined) {
        process.env[key] = param.Value;
      }
    }
    nextToken = res.NextToken;
  } while (nextToken);
}
