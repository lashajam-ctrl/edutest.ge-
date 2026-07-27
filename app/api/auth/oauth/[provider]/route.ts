import { appOrigin, getSessionUser, oauthCallbackUrl, oauthConfig, oauthStateCookie, randomToken, sha256, type OAuthProvider } from "@/lib/auth";

function providerFrom(value: string): OAuthProvider | null {
  return value === "google" || value === "microsoft" || value === "facebook" ? value : null;
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const provider = providerFrom((await context.params).provider);
  if (!provider) return Response.json({ error: "Unsupported provider" }, { status: 404 });
  const requestUrl = new URL(request.url);
  const requestedRole = requestUrl.searchParams.get("role") === "teacher" ? "pending_teacher" : "student";
  const requestedGrade = requestUrl.searchParams.get("grade")?.trim() ?? "";
  const grade = requestedRole === "student" && /^(?:[1-9]|1[0-2])[A-Za-zა-ჰ]?$/.test(requestedGrade) ? requestedGrade : "";
  const mode = requestUrl.searchParams.get("mode") === "link" ? "link" : "login";
  if (mode === "link" && !(await getSessionUser(request))) return Response.json({ error: "Sign in before linking an account" }, { status: 401 });
  const config = oauthConfig(provider);
  if (!config.clientId || !config.clientSecret) return Response.json({ error: `${provider} ავტორიზაცია ჯერ არ არის კონფიგურირებული` }, { status: 503 });
  const state = randomToken(24);
  const verifier = randomToken(48);
  appOrigin(request);
  const callback = oauthCallbackUrl(request, provider);
  const endpoint = provider === "google"
    ? "https://accounts.google.com/o/oauth2/v2/auth"
    : provider === "microsoft"
      ? "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
      : "https://www.facebook.com/dialog/oauth";
  const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: callback, response_type: "code", state });
  if (provider === "facebook") {
    params.set("scope", "email,public_profile");
  } else {
    params.set("scope", "openid email profile");
    params.set("prompt", "select_account");
    params.set("code_challenge", await sha256(verifier));
    params.set("code_challenge_method", "S256");
  }
  const cookie = oauthStateCookie(`${provider}.${state}.${verifier}.${requestedRole}.${grade}.${mode}`, request);
  return new Response(null, { status: 302, headers: { Location: `${endpoint}?${params}`, "Set-Cookie": cookie, "Cache-Control": "no-store" } });
}
