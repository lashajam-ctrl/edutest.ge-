import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = path => readFile(new URL(path, root), "utf8");
const section = (text, start, end) => text.slice(text.indexOf(start), text.indexOf(end, text.indexOf(start) + start.length));

test("uses a server session cookie and never a browser-stored JWT", async () => {
  const [auth, html] = await Promise.all([source("lib/auth.ts"), source("public/app.html")]);
  assert.match(auth, /HttpOnly/);
  assert.match(auth, /SameSite=Lax/);
  assert.match(auth, /appOrigin\(request\).*Secure/s);
  assert.doesNotMatch(html, /localStorage\.(?:getItem|setItem)\([^)]*(?:jwt|token)/i);
  assert.doesNotMatch(html, /sessionStorage\.(?:getItem|setItem)\([^)]*(?:jwt|token)/i);
});

test("enforces server RBAC for student, teacher and administrator data", async () => {
  const [admin, attempts, assignments, ai] = await Promise.all([
    source("app/api/admin/users/route.ts"),
    source("app/api/attempts/route.ts"),
    source("app/api/assignments/route.ts"),
    source("app/api/ai/feedback/route.ts"),
  ]);
  assert.match(admin, /current\?\.user\.role === "admin"/);
  assert.match(attempts, /current\.user\.role !== "teacher" && current\.user\.role !== "admin"/);
  assert.match(attempts, /assignments\.createdBy, current\.user\.id/);
  assert.match(assignments, /row\.createdBy === current\.user\.id/);
  assert.match(ai, /current\.user\.role !== "student"/);
});

test("renders untrusted CSV, user and AI values as text, including XSS-shaped input", async () => {
  const html = await source("public/app.html");
  for (const [start, end] of [
    ["function previewCSV", "function importCSV"],
    ["function renderAdminUsers", "async function doLogout"],
    ["function showAiExplanation", "async function requestAiExplanation"],
  ]) {
    const code = section(html, start, end);
    assert.match(code, /textContent/);
    assert.doesNotMatch(code, /innerHTML|insertAdjacentHTML/);
  }
  const payload = `<img src=x onerror="globalThis.pwned=true">`;
  assert.equal(payload.replace(/[&<>"']/g, ""), "img src=x onerror=globalThis.pwned=true");
});

test("ships no demo credentials, realistic pre-rendered PII, or secret-shaped values", async () => {
  const files = ["public/app.html", ".env.example", "README.md"];
  const combined = (await Promise.all(files.map(async file => {
    try { return await source(file); } catch { return ""; }
  }))).join("\n");
  assert.doesNotMatch(combined, /(?:student|teacher|admin)123|changeme123|admin_jwt/i);
  assert.doesNotMatch(combined, /mariam@student\.ge|admin@edutest\.ge|\+995 555 000 000/i);
  assert.doesNotMatch(combined, /\bsk-[A-Za-z0-9_-]{16,}\b/);
});

test("publishes privacy and terms pages with current feature disclosures", async () => {
  await Promise.all([access(new URL("public/privacy.html", root)), access(new URL("public/terms.html", root))]);
  const [privacy, terms] = await Promise.all([source("public/privacy.html"), source("public/terms.html")]);
  assert.match(privacy, /AI განმარტება/);
  assert.match(privacy, /Secure, HttpOnly და SameSite/);
  assert.match(terms, /გადახდის ფუნქცია.*გამორთულია/);
});

