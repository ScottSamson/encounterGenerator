import { handler } from "../src/lambda.ts";
console.log("handler type:", typeof handler);
const event = {
  version: "2.0",
  routeKey: "$default",
  rawPath: "/",
  rawQueryString: "",
  headers: { host: "localhost" },
  requestContext: {
    http: { method: "GET", path: "/", sourceIp: "127.0.0.1" },
  },
  isBase64Encoded: false,
};
const result = await handler(event, {});
console.log("result:", JSON.stringify(result));
