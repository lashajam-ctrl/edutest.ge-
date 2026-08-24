import { and, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { identities, oauthLinkRequests, users } from "@/db/schema";
import { appOrigin, createSession, getSessionUser, oauthCallbackUrl, oauthConfig, oauthLinkCookie, oauthStateCookie, randomToken, sha256, type OAuthProvider } from "@/lib/auth";

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
  const profile = await profileResponse.json() as { sub?: string; id?: string; email?: string; preferred_username?: string; email_verified?: boolean; name?: string };
  const subject = provider === "facebook" ? profile.id : profile.sub;
  const email = (profile.email ?? profile.preferred_username ?? "").trim().toLowerCase();
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
    const mode = saved[5] || "login";
    [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const now = new Date();
    if (user) {
      if (mode === "signup") return redirect(origin, "account-exists", [clearOauthCookie]);
      if (user.passwordHash) {
        const linkToken = randomToken(32);
        await db.delete(oauthLinkRequests).where(eq(oauthLinkRequests.userId, user.id));
        await db.insert(oauthLinkRequests).values({
          id: crypto.randomUUID(), userId: user.id, provider, providerSubject: subject,
          tokenHash: await sha256(linkToken), expiresAt: new Date(now.getTime() + 10 * 60 * 1000), createdAt: now,
        });
        return redirect(origin, "confirm-password", [clearOauthCookie, oauthLinkCookie(linkToken, request)]);
      }
      // An email match alone is not enough to merge two social identities.
      // Sign in with the provider already linked to the account first, then
      // add another provider from an authenticated account-linking flow.
      return redirect(origin, "use-existing-method", [clearOauthCookie]);
    } else {
      if (mode === "login") return redirect(origin, "registration-details-required", [clearOauthCookie]);
    // Provider-first onboarding creates a restricted provisional profile. The
    // verified user chooses role/grade and accepts the policies on the next,
    // server-validated profile step before accessing protected learning data.
      const role = "student" as const;
      const grade = null;
      user = {
        id: crypto.randomUUID(), email, name: profile.name || email.split("@")[0], role, grade, school: null,
        birthDate: null, guardianEmail: null, guardianVerifiedAt: null, termsVersion: null, privacyVersion: null,
        profileCompletedAt: null, accountStatus: "onboarding", passwordHash: null, passwordSalt: null,
        emailVerified: true, createdAt: now, updatedAt: now,
      };
      await db.insert(users).values(user);
      await db.insert(identities).values({ id: crypto.randomUUID(), userId: user.id, provider, providerSubject: subject, createdAt: now }).onConflictDoNothing();
    }
  }
  const session = await createSession(user.id, request);
  return redirect(origin, "success", [session.cookie, clearOauthCookie, oauthLinkCookie("", request, 0)]);
}
