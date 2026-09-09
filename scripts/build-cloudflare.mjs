import { spawnSync } from "node:child_process";

const sourceCheck=spawnSync(process.execPath,["scripts/assemble-app.mjs","--check"],{stdio:"inherit"});
if(sourceCheck.status!==0)process.exit(sourceCheck.status||1);

const result = spawnSync(
  process.execPath,
  ["node_modules/vinext/dist/cli.js", "build"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      EDUTEST_DEPLOY_TARGET: "cloudflare",
    },
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
