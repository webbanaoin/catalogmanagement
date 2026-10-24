import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Run the real TypeScript helper on supported Node 20+ without tsx/ts-node.
const code = readFileSync(new URL("../src/lib/growth-origin.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(code, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const module = { exports: {} };
runInNewContext(compiled, { module, exports: module.exports, URL });
const { isTrustedGrowthOrigin } = module.exports;
assert.equal(typeof isTrustedGrowthOrigin, "function");

const publicUrl = "https://digishowroom.webbanao.in";
const internalUrl = "http://localhost:8080/api/public/shops/angel-event-decorator-and-planner/growth/events";
assert.equal(isTrustedGrowthOrigin(publicUrl, publicUrl, internalUrl), true,
  "public HTTPS origin must be allowed when Railway proxies via localhost");
assert.equal(isTrustedGrowthOrigin(publicUrl, publicUrl, publicUrl + "/api/growth/events"), true);
assert.equal(isTrustedGrowthOrigin("https://not-our-platform.example", publicUrl, internalUrl), false,
  "third-party origins must still be rejected");
assert.equal(isTrustedGrowthOrigin("null", publicUrl, internalUrl), false);
assert.equal(isTrustedGrowthOrigin(null, publicUrl, internalUrl), true,
  "clients without an Origin header remain permitted under rate limits");
console.log("Railway reverse-proxy analytics origin tests OK");
