import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pngSize = async path => {
  const bytes = await readFile(path);
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
};

test("Google-facing brand icons have stable square assets", async () => {
  const expected = new Map([
    ["public/favicon-48.png", 48],
    ["public/favicon-96.png", 96],
    ["public/favicon-192.png", 192],
    ["public/apple-touch-icon.png", 180],
    ["public/meta-app-icon-1024.png", 1024],
  ]);
  for (const [path, size] of expected) assert.deepEqual(await pngSize(path), [size, size], path);
  assert.ok((await readFile("public/favicon.ico")).length > 0);
});

test("homepage metadata declares favicon and organization logo", async () => {
  const layout = await readFile("app/layout.tsx", "utf8");
  const appHtml = await readFile("public/app.html", "utf8");
  for (const value of ["/favicon-48.png", "/favicon-96.png", "/favicon-192.png", "/apple-touch-icon.png"]) {
    assert.match(layout, new RegExp(value.replaceAll("/", "\\/")));
    assert.match(appHtml, new RegExp(value.replaceAll("/", "\\/")));
  }
  for (const source of [layout, appHtml]) {
    assert.match(source, /https:\/\/edutest\.ge\/meta-app-icon-1024\.png/);
    assert.match(source, /https:\/\/edutest\.ge\/#organization/);
  }
});
