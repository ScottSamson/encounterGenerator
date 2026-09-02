import serverlessExpressPkg from "@codegenie/serverless-express";
import app from "./app.ts";

// The package's shipped .d.ts doesn't match its CJS runtime shape under this project's
// nodenext resolution (module.exports is the configure function itself); the cast below
// reflects the actual runtime export, not a workaround for our code.
const configure = serverlessExpressPkg as unknown as (params: { app: typeof app }) => (...args: any[]) => any;

export const handler = configure({ app });
