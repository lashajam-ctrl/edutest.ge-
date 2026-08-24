import { env } from "cloudflare:workers";
import { oauthConfig } from "@/lib/auth";

export async function GET() {
  const google = oauthConfig("google");
  const microsoft = oauthConfig("microsoft");
  const facebook = oauthConfig("facebook");
  const runtime = env as unknown as Record<string, string>;
  const facebookConfigured = Boolean(facebook.clientId && facebook.clientSecret);
  const facebookPublic = facebookConfigured && runtime.FACEBOOK_PUBLIC_ENABLED === "true";
  return Response.json({
    google: Boolean(google.clientId && google.clientSecret),
    microsoft: Boolean(microsoft.clientId && microsoft.clientSecret),
    facebook: facebookPublic,
    facebookPendingReview: facebookConfigured && !facebookPublic,
  }, { headers: { "Cache-Control": "no-store" } });
}
