import serverlessExpressPkg from "@codegenie/serverless-express";
import app from "./app.ts";

// The package's shipped .d.ts doesn't match its CJS runtime shape under this project's
// nodenext resolution (module.exports is the configure function itself); the cast below
// reflects the actual runtime export, not a workaround for our code.
const configure = serverlessExpressPkg as unknown as (params: { app: typeof app }) => (...args: any[]) => any;

const serverlessHandler = configure({ app });

// The infra schedules a once-a-day EventBridge ping (`{ warmer: true }`) purely to keep
// the VPC Hyperplane ENI — and therefore the Elastic IP association that gives this
// function its static outbound IP — from being reclaimed during long idle periods. It is
// not an HTTP event, so it must never reach serverless-express.
export const handler = (event: any, context: any) => {
  if (event && event.warmer === true) {
    return Promise.resolve({ warmed: true });
  }
  return serverlessHandler(event, context);
};
