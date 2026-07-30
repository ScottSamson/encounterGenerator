// Invokes the Lambda handler in-process with a synthetic Function URL (v2) event,
// without needing a real Lambda environment or Docker. Fast feedback loop for wiring
// changes; run `npm run test:lambda-invoke`. For higher-fidelity testing of the actual
// packaged zip contents, run `npm run package:lambda` and exercise `lambda-build/`
// directly with a Node.js Lambda base image + the Runtime Interface Emulator instead.
process.env.AWS_LAMBDA_FUNCTION_NAME ??= "local-test";

const { handler } = await import("../src/lambda.ts");

const path = process.argv[2] ?? "/api/encounters/generate";
const queryString = process.argv[3] ?? "partySize=4&avgPlayerLevel=1";

const event = {
  version: "2.0",
  routeKey: "$default",
  rawPath: path,
  rawQueryString: queryString,
  headers: { host: "localhost" },
  requestContext: {
    http: { method: "GET", path, sourceIp: "127.0.0.1" },
  },
  isBase64Encoded: false,
};

const result = await handler(event, {});
console.log(`Status: ${result.statusCode}`);
console.log(JSON.stringify(JSON.parse(result.body), null, 2));

process.exit(0);
