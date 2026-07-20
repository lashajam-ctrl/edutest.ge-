import { and, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { identities, users } from "@/db/schema";
import { appOrigin, createSession, getSessionUser, oauthCallbackUrl, oauthConfig, oauthStateCookie, type OAuthProvider } from "@/lib/auth";

function providerFrom(value: string): OAuthProvider | null {
  return value === "google" || value === "microsoft" || value === "facebook" ? value : null;
}
function cookieValue(request: Request, name: string) { return request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1); }
function redirect(origin: string, status: string, cookies: string[] = []) {
  const headers = new Headers({ Location: `${origin}/?auth=${encodeURIComponent(status)}`, "Cache-Control": "no-store" });
  cookies.forEach(cookie => headers.append("Set-Cookie", cookie));
  return new Response(null, { status: 302, headers });
}
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const provider = providerFrom((await context.params).provider);
  const url = new URL(request.url);
  const origin = appOrigin(request);
  const clearOauthCookie = oauthStateCookie("", request, 0);
  if (url.searchParams.get("error")) return redirect(origin, "cancelled", [clearOauthCookie]);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = cookieValue(request, "edutest_oauth")?.split(".");
  if (!provider || !code || !state || saved?.[0] !== provider || saved[1] !== state || !saved[2]) return redirect(origin, "invalid", [clearOauthCookie]);
  const config = oauthConfig(provider);
  if (!config.clientId || !config.clientSecret) return redirect(origin, "unconfigured", [clearOauthCookie]);
  const callback = oauthCallbackUrl(request, provider);
  const tokenParams = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code, grant_type: "authorization_code", redirect_uri: callback });
  let tokenResponse: Response;
  if (provider === "facebook") {
    const tokenUrl = new URL("https://graph.facebook.com/oauth/access_token");
    tokenUrl.search = tokenParams.toString();
    tokenResponse = await fetch(tokenUrl, { headers: { Accept: "application/json" } });
  } else {
    tokenParams.set("code_verifier", saved[2]);
    const tokenEndpoint = provider === "google" ? "https://oauth2.googleapis.com/token" : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    tokenResponse = await fetch(tokenEndpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: tokenParams });
  }
  if (!tokenResponse.ok) return redirect(origin, "failed", [clearOauthCookie]);
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) return redirect(origin, "failed", [clearOauthCookie]);
  const profileEndpoint = provider === "google"
    ? "https://openidconnect.googleapis.com/v1/userinfo"
    : provider === "microsoft"
      ? "https://graph.microsoft.com/oidc/userinfo"
      : "https://graph.facebook.com/me?fields=id,name,email";
  const profileResponse = await fetch(profileEndpoint, { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!profileResponse.ok) return redirect(origin, "failed", [clearOauthCookie]);
  const profile = await profileResponse.json() as { sub?: string; id?: string; email?: string; email_verified?: boolean; name?: string };
  const subject = provider === "facebook" ? profile.id : profile.sub;
  const email = (profile.email ?? "").trim().toLowerCase();
  if (!subject || !validEmail(email)) return redirect(origin, "no-email", [clearOauthCookie]);
  if (provider === "google" && profile.email_verified !== true) return redirect(origin, "email-unverified", [clearOauthCookie]);

  await ensureSchema();
  const db = getDb();
  const [linked] = await db.select({ user: users }).from(identities).innerJoin(users, eq(users.id, identities.userId)).where(and(eq(identities.provider, provider), eq(identities.providerSubject, subject))).limit(1);
  if (saved[5] === "link") {
    const current = await getSessionUser(request);
    if (!current) return redirect(origin, "invalid", [clearOauthCookie]);
    if (linked && linked.user.id !== current.user.id) return redirect(origin, "provider-in-use", [clearOauthCookie]);
    if (!linked) await db.insert(identities).values({ id: crypto.randomUUID(), userId: current.user.id, provider, providerSubject: subject, createdAt: new Date() }).onConflictDoNothing();
    return redirect(origin, "linked", [clearOauthCookie]);
  }
  let user = linked?.user;
  if (!user) {
    [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const now = new Date();
    if (user) return redirect(origin, "account-exists", [clearOauthCookie]);
    const role = saved[3] === "pending_teacher" ? "pending_teacher" as const : "student" as const;
    const grade = role === "student" && /^(?:[1-9]|1[0-2])[A-Za-zა-ჰ]?$/.test(saved[4] ?? "") ? saved[4] : null;
    if (role === "student" && !grade) return redirect(origin, "registration-details-required", [clearOauthCookie]);
    user = { id: crypto.randomUUID(), email, name: profile.name || email.split("@")[0], role, grade, school: null, passwordHash: null, passwordSalt: null, emailVerified: true, parentEmail: null, parentEmailVerified: false, resultEmailEnabled: true, parentResultEmailEnabled: true, createdAt: now, updatedAt: now };
    await db.insert(users).values(user);
    await db.insert(identities).values({ id: crypto.randomUUID(), userId: user.id, provider, providerSubject: subject, createdAt: now }).onConflictDoNothing();
  }
  const session = await createSession(user.id, request);
  return redirect(origin, "success", [session.cookie, clearOauthCookie]);
}
