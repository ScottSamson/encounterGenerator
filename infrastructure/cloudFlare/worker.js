// Cloudflare Worker: reverse proxy to the Lambda Function URL.
//
// The Function URL uses AWS_IAM auth, so every forwarded request is SigV4-signed here
// (service "lambda"). Set these as encrypted Worker secrets:
//   AWS_ACCESS_KEY_ID       - the lambda_proxy IAM user's access key id
//   AWS_SECRET_ACCESS_KEY   - its secret
//   AWS_SESSION_TOKEN       - only if you use temporary STS credentials (optional)
// Optional plain var:
//   LAMBDA_ORIGIN           - overrides the hard-coded origin below (per-env workers)

const DEFAULT_LAMBDA_ORIGIN =
  "https://ph7rp3hfchg5ygcd6rb3v4pnyi0mwesy.lambda-url.us-west-2.on.aws";
const SERVICE = "lambda";

export default {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);

    // Only API paths are proxied to the Lambda. Everything else (the static site) passes
    // straight through to the origin. Ideally the Worker's route is also scoped to
    // `/api/*` so it never sees non-API requests at all.
    if (!incomingUrl.pathname.startsWith("/api/")) {
      return fetch(request);
    }

    const origin = (env.LAMBDA_ORIGIN || DEFAULT_LAMBDA_ORIGIN).replace(/\/+$/, "");
    const region = regionFromLambdaUrl(origin);

    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      return json({ error: "Worker missing AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY secrets" }, 500);
    }

    const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, origin);

    // Buffer the body so it can be hashed for the signature. Payloads on this API are
    // small; GET/HEAD have none.
    const hasBody = !["GET", "HEAD"].includes(request.method);
    const bodyBytes = hasBody ? new Uint8Array(await request.arrayBuffer()) : undefined;
    const contentType = hasBody ? request.headers.get("content-type") : null;

    let signedHeaders;
    try {
      signedHeaders = await signRequest({
        method: request.method,
        url: targetUrl,
        body: bodyBytes,
        contentType,
        region,
        service: SERVICE,
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        sessionToken: env.AWS_SESSION_TOKEN,
      });
    } catch (err) {
      return json({ error: "Signing failed", details: String(err && err.message || err) }, 500);
    }

    try {
      const upstream = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: signedHeaders, // only the signed set is forwarded
        body: bodyBytes,
        redirect: "manual",
      });
      // Re-wrap so the response headers are mutable (Cloudflare can add its own).
      return new Response(upstream.body, upstream);
    } catch (error) {
      return json({ error: "Gateway Error", details: String(error && error.message || error) }, 502);
    }
  },
};

// --- helpers ----------------------------------------------------------------

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function regionFromLambdaUrl(origin) {
  // https://<id>.lambda-url.<region>.on.aws
  const m = /\.lambda-url\.([a-z0-9-]+)\.on\.aws$/.exec(new URL(origin).hostname);
  return m ? m[1] : "us-west-2";
}

const encoder = new TextEncoder();

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(data) {
  const bytes = typeof data === "string" ? encoder.encode(data) : (data ?? new Uint8Array(0));
  return toHex(await crypto.subtle.digest("SHA-256", bytes));
}

async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data)));
}

async function deriveSigningKey(secret, dateStamp, region, service) {
  let key = encoder.encode("AWS4" + secret);
  key = await hmac(key, dateStamp);
  key = await hmac(key, region);
  key = await hmac(key, service);
  key = await hmac(key, "aws4_request");
  return key;
}

// RFC 3986 encoding (encodeURIComponent leaves !'()* unescaped).
function rfc3986(str) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function canonicalUri(pathname) {
  return (
    pathname
      .split("/")
      .map((seg) => (seg === "" ? "" : rfc3986(decodeURIComponent(seg))))
      .join("/") || "/"
  );
}

function canonicalQuery(searchParams) {
  const pairs = [];
  for (const [k, v] of searchParams) pairs.push([rfc3986(k), rfc3986(v)]);
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return pairs.map(([k, v]) => `${k}=${v}`).join("&");
}

async function signRequest({
  method,
  url,
  body,
  contentType,
  region,
  service,
  accessKeyId,
  secretAccessKey,
  sessionToken,
}) {
  const amzDate = new Date().toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);

  const headers = {
    host: url.hostname,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;
  if (sessionToken) headers["x-amz-security-token"] = sessionToken;

  const sortedNames = Object.keys(headers).sort();
  const signedHeaderList = sortedNames.join(";");
  const canonicalHeaders = sortedNames.map((n) => `${n}:${String(headers[n]).trim()}\n`).join("");

  const canonicalRequest = [
    method,
    canonicalUri(url.pathname),
    canonicalQuery(url.searchParams),
    canonicalHeaders,
    signedHeaderList,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await deriveSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = toHex(await hmac(signingKey, stringToSign));

  headers["authorization"] =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaderList}, Signature=${signature}`;

  return headers;
}
