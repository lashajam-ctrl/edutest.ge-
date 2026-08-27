const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export function encodeBase32(bytes) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

export function decodeBase32(value) {
  const clean = String(value || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let buffer = 0;
  const output = [];
  for (const char of clean) {
    const position = alphabet.indexOf(char);
    if (position < 0) throw new Error("Invalid Base32 secret");
    buffer = (buffer << 5) | position;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

export function generateTotpSecret(size = 20) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return encodeBase32(bytes);
}

export async function totpAt(secret, counter) {
  const key = await crypto.subtle.importKey(
    "raw",
    decodeBase32(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const message = new Uint8Array(8);
  let remaining = BigInt(counter);
  for (let index = 7; index >= 0; index--) {
    message[index] = Number(remaining & 255n);
    remaining >>= 8n;
  }
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
  const offset = digest[digest.length - 1] & 15;
  const binary = ((digest[offset] & 127) << 24)
    | ((digest[offset + 1] & 255) << 16)
    | ((digest[offset + 2] & 255) << 8)
    | (digest[offset + 3] & 255);
  return String(binary % 1_000_000).padStart(6, "0");
}

export async function verifyTotp(secret, code, options = {}) {
  if (!/^\d{6}$/.test(String(code || ""))) return null;
  const now = Number(options.now ?? Date.now());
  const lastUsedCounter = Number(options.lastUsedCounter ?? -1);
  const currentCounter = Math.floor(now / 30_000);
  for (const offset of [-1, 0, 1]) {
    const counter = currentCounter + offset;
    if (counter <= lastUsedCounter) continue;
    if (constantTimeEqual(await totpAt(secret, counter), String(code))) return counter;
  }
  return null;
}
