import { env } from "cloudflare:workers";
import { ensureSchema } from "@/db";
import { generateTotpSecret, verifyTotp } from "@/lib/totp.js";

type AdminSession = { user: { id: string; email: string; role: string }; sessionId: string };

type FactorRow = {
  encrypted_secret: string;
  confirmed_at: number | null;
  last_used_counter: number;
};

function encode(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const raw = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

async function wrappingKey() {
  const runtime = env as unknown as Record<string, string>;
  const material = runtime.MFA_ENCRYPTION_KEY?.trim() || runtime.ADMIN_BOOTSTRAP_TOKEN?.trim();
  if (!material || material.length < 16) throw new Error("MFA encryption key is unavailable");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`edutest-admin-mfa:v1:${material}`));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptSecret(secret: string) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await wrappingKey(), new TextEncoder().encode(secret));
  return `${encode(iv)}.${encode(new Uint8Array(cipher))}`;
}

async function decryptSecret(value: string) {
  const [ivValue, cipherValue] = value.split(".");
  if (!ivValue || !cipherValue) throw new Error("Invalid encrypted MFA factor");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(ivValue) }, await wrappingKey(), decode(cipherValue));
  return new TextDecoder().decode(plain);
}

async function factorFor(userId: string) {
  return env.DB.prepare("SELECT encrypted_secret, confirmed_at, last_used_counter FROM admin_mfa_factors WHERE user_id = ?")
    .bind(userId).first<FactorRow>();
}

export async function adminMfaState(current: AdminSession) {
  await ensureSchema();
  if (current.user.role !== "admin") return { required: false, enrolled: false, verified: true };
  const now = Date.now();
  const [factor, verification] = await Promise.all([
    factorFor(current.user.id),
    env.DB.prepare("SELECT expires_at FROM session_mfa_verifications WHERE session_id = ? AND expires_at > ?")
      .bind(current.sessionId, now).first<{ expires_at: number }>(),
  ]);
  return { required: true, enrolled: Boolean(factor?.confirmed_at), verified: Boolean(verification) };
}

export async function beginAdminMfaEnrollment(current: AdminSession) {
  await ensureSchema();
  if (current.user.role !== "admin") throw new Error("Administrator role required");
  const existing = await factorFor(current.user.id);
  if (existing?.confirmed_at) return { enrolled: true as const };
  const secret = generateTotpSecret();
  const encryptedSecret = await encryptSecret(secret);
  const now = Date.now();
  await env.DB.prepare(`
    INSERT INTO admin_mfa_factors (user_id, encrypted_secret, confirmed_at, last_used_counter, created_at, updated_at)
    VALUES (?, ?, NULL, -1, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET encrypted_secret = excluded.encrypted_secret, confirmed_at = NULL,
      last_used_counter = -1, updated_at = excluded.updated_at
  `).bind(current.user.id, encryptedSecret, now, now).run();
  const label = encodeURIComponent(current.user.email);
  const issuer = encodeURIComponent("EduTest.ge");
  return {
    enrolled: false as const,
    secret,
    otpauthUri: `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
  };
}

export async function verifyAdminMfaCode(current: AdminSession, code: string) {
  await ensureSchema();
  if (current.user.role !== "admin") throw new Error("Administrator role required");
  const factor = await factorFor(current.user.id);
  if (!factor) throw new Error("MFA enrollment is required");
  const counter = await verifyTotp(await decryptSecret(factor.encrypted_secret), code, { lastUsedCounter: factor.last_used_counter });
  if (counter === null) return false;
  const now = Date.now();
  const expiresAt = now + 12 * 60 * 60_000;
  await env.DB.batch([
    env.DB.prepare("UPDATE admin_mfa_factors SET confirmed_at = COALESCE(confirmed_at, ?), last_used_counter = ?, updated_at = ? WHERE user_id = ?")
      .bind(now, counter, now, current.user.id),
    env.DB.prepare(`
      INSERT INTO session_mfa_verifications (session_id, verified_at, expires_at) VALUES (?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET verified_at = excluded.verified_at, expires_at = excluded.expires_at
    `).bind(current.sessionId, now, expiresAt),
  ]);
  return true;
}
