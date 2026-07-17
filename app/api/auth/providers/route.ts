import { oauthConfig } from "@/lib/auth";

export async function GET() {
  const google = oauthConfig("google");
  const microsoft = oauthConfig("microsoft");
  const facebook = oauthConfig("facebook");
  return Response.json({
    google: Boolean(google.clientId && google.clientSecret),
    microsoft: Boolean(microsoft.clientId && microsoft.clientSecret),
    facebook: Boolean(facebook.clientId && facebook.clientSecret),
  }, { headers: { "Cache-Control": "no-store" } });
}
