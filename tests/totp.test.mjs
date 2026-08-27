import assert from "node:assert/strict";
import test from "node:test";
import { decodeBase32, encodeBase32, totpAt, verifyTotp } from "../lib/totp.js";

test("encodes and decodes RFC-compatible Base32 secrets", () => {
  const bytes = new TextEncoder().encode("12345678901234567890");
  const encoded = encodeBase32(bytes);
  assert.equal(encoded, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  assert.deepEqual(decodeBase32(encoded), bytes);
});

test("computes TOTP codes and rejects replayed counters", async () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(await totpAt(secret, 1), "287082");
  assert.equal(await verifyTotp(secret, "287082", { now: 59_000, lastUsedCounter: -1 }), 1);
  assert.equal(await verifyTotp(secret, "287082", { now: 59_000, lastUsedCounter: 1 }), null);
  assert.equal(await verifyTotp(secret, "12345", { now: 59_000 }), null);
});
