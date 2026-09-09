import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const html = await readFile(new URL("../public/app.html", import.meta.url), "utf8");
const scriptPattern = /<script([^>]*)>([\s\S]*?)<\/script>/g;
let match;
let checked = 0;
const classic=[];
while ((match = scriptPattern.exec(html))) {
  const attributes = match[1] ?? "";
  if (/application\/ld\+json/.test(attributes)) continue;
  const src=attributes.match(/\bsrc=["']([^"']+)["']/)?.[1];
  if(src==='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2')continue; // Existing vendor; not a local build artifact.
  if(src&&(!src.startsWith('/')||src.startsWith('//')))throw new Error('Unexpected external executable script: '+src);
  const code=src?await readFile(new URL('../public'+src.split('?')[0],import.meta.url),'utf8'):match[2];
  new Script(code,{filename:src||'app-inline'});
  if(!/type=["']module["']/.test(attributes))classic.push(code);
  checked += 1;
}
new Script(classic.join('\n;\n'),{filename:'all-delivered-classic-scripts'});
console.log(JSON.stringify({ browserScriptsSyntaxChecked: checked }));
