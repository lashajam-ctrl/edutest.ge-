import { env } from "cloudflare:workers";
import { and, eq, gt } from "drizzle-orm";
import { ensureSchema, getDb } from "../db";
import { sessions, users } from "../db/schema";

const encoder = new TextEncoder();
const cookieName = "edutest_session";

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

export async function sha256(value: string) {
  return bytesToBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

const passwordIterations = 100_000;
const legacyPasswordIterations = 210_000;

export async function hashPassword(password: string, storedSalt?: string) {
  const versioned = storedSalt?.match(/^pbkdf2\$(\d+)\$(.+)$/);
  const iterations = versioned ? Number(versioned[1]) : storedSalt ? legacyPasswordIterations : passwordIterations;
  const rawSalt = versioned?.[2] ?? storedSalt ?? randomToken(18);
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(rawSalt), iterations }, material, 256);
  return { salt: storedSalt ?? `pbkdf2$${iterations}$${rawSalt}`, hash: bytesToBase64(new Uint8Array(bits)) };
}

export async function verifyPassword(password: string, salt: string, expected: string) {
  const { hash } = await hashPassword(password, salt);
  if (hash.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < hash.length; i++) mismatch |= hash.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

export async function createSession(userId: string, request?: Request) {
  await ensureSchema();
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14);
  await getDb().insert(sessions).values({ id: crypto.randomUUID(), userId, tokenHash: await sha256(token), createdAt: now, expiresAt: expires });
  const secure = !request || new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return { token, cookie: `${cookieName}=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=1209600` };
}

export async function getSessionUser(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!token) return null;
  await ensureSchema();
  const [row] = await getDb().select({ user: users, sessionId: sessions.id }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(and(eq(sessions.tokenHash, await sha256(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  return row ?? null;
}

export async function destroySession(request: Request) {
  const current = await getSessionUser(request);
  if (current) await getDb().delete(sessions).where(eq(sessions.id, current.sessionId));
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${cookieName}=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`;
}

export function publicUser(user: typeof users.$inferSelect) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, grade: user.grade ?? "", school: user.school ?? "" };
}

export type OAuthProvider = "google" | "microsoft" | "facebook";

export function oauthConfig(provider: OAuthProvider) {
  const runtime = env as unknown as Record<string, string>;
  if (provider === "google") return { clientId: runtime.GOOGLE_CLIENT_ID, clientSecret: runtime.GOOGLE_CLIENT_SECRET };
  if (provider === "microsoft") return { clientId: runtime.MICROSOFT_CLIENT_ID, clientSecret: runtime.MICROSOFT_CLIENT_SECRET };
  return { clientId: runtime.FACEBOOK_APP_ID, clientSecret: runtime.FACEBOOK_APP_SECRET };
}

export function appOrigin(request: Request) {
  const runtime = env as unknown as Record<string, string>;
  const configured = runtime.APP_ORIGIN?.trim();
  if (!configured) return new URL(request.url).origin;

  const url = new URL(configured);
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !localHttp) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("APP_ORIGIN must be an HTTPS origin without a path (HTTP is allowed only for localhost).");
  }
  return url.origin;
}

export function oauthCallbackUrl(request: Request, provider: OAuthProvider) {
  return `${appOrigin(request)}/api/auth/oauth/${provider}/callback`;
}

export function oauthStateCookie(value: string, request: Request, maxAge = 600) {
  const secure = new URL(appOrigin(request)).protocol === "https:" ? "; Secure" : "";
  return `edutest_oauth=${value}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${maxAge}`;
}
