import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../public/app.html", import.meta.url), "utf8");
const scriptPattern = /<script([^>]*)>([\s\S]*?)<\/script>/g;
let match;
let checked = 0;
while ((match = scriptPattern.exec(html))) {
  const attributes = match[1] ?? "";
  if (/\bsrc\s*=/.test(attributes) || /application\/ld\+json/.test(attributes)) continue;
  // eslint-disable-next-line no-new-func
  new Function(match[2]);
  checked += 1;
}
const management = await readFile(new URL("../public/management-overrides.js", import.meta.url), "utf8");
// eslint-disable-next-line no-new-func
new Function(management);
console.log(JSON.stringify({ browserScriptsSyntaxChecked: checked + 1 }));
