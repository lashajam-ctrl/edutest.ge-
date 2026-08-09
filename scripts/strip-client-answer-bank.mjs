import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const path = resolve("public/app.html");
let html = await readFile(path, "utf8");
const startMarker = "const Q_POOL={";
const endMarker = "const Q_TRANS={";
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker, start + startMarker.length);
if (start < 0 || end < 0 || end <= start) throw new Error("Client answer-bank markers were not found");
html = `${html.slice(0, start)}const Q_POOL={};\n\n${html.slice(end)}`;
const legacyStartMarker = "// === NEW QUESTION POOLS (v2-v6) ===";
const legacyEndMarker = "// === END HIST 7-12 ===";
const legacyStart = html.indexOf(legacyStartMarker);
const legacyEnd = html.indexOf(legacyEndMarker, legacyStart + legacyStartMarker.length);
if (legacyStart < 0 || legacyEnd < 0) throw new Error("Legacy answer-bank extension markers were not found");
html = `${html.slice(0, legacyStart)}// Legacy client-side question extensions retired; active content is server-backed.\n${html.slice(legacyEnd + legacyEndMarker.length)}`;
for (const source of ["expanded-question-bank.js", "senior-math-bank.js", "language-blueprint-bank.js"]) {
  html = html.replace(new RegExp(`<script\\s+src=["']/${source.replaceAll(".", "\\.")}["']><\\/script>\\s*`, "g"), "");
}
if (!html.includes('<script src="/server-assessments.js"></script>')) {
  const marker = '<script src="/management-overrides.js"></script>';
  if (!html.includes(marker)) throw new Error("Management override marker was not found");
  html = html.replace(marker, `${marker}\n<script src="/server-assessments.js"></script>`);
}
await writeFile(path, html, "utf8");
console.log(JSON.stringify({ ok: true, file: path, bytes: Buffer.byteLength(html) }));
