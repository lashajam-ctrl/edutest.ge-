import { appOrigin, getSessionUser, oauthCallbackUrl, oauthConfig, oauthStateCookie, randomToken, sha256 } from "@/lib/auth";

type Provider = "google" | "microsoft";
function providerFrom(value: string): Provider | null { return value === "google" || value === "microsoft" ? value : null; }

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
  const challenge = await sha256(verifier);
  appOrigin(request);
  const callback = oauthCallbackUrl(request, provider);
  const endpoint = provider === "google" ? "https://accounts.google.com/o/oauth2/v2/auth" : "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
  const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: callback, response_type: "code", state, code_challenge: challenge, code_challenge_method: "S256", scope: "openid email profile", prompt: "select_account" });
  const cookie = oauthStateCookie(`${provider}.${state}.${verifier}.${requestedRole}.${grade}.${mode}`, request);
  return new Response(null, { status: 302, headers: { Location: `${endpoint}?${params}`, "Set-Cookie": cookie, "Cache-Control": "no-store" } });
}
