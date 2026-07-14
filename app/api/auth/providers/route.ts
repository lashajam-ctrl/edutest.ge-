import { oauthConfig } from "@/lib/auth";

export async function GET() {
  const google = oauthConfig("google");
  const microsoft = oauthConfig("microsoft");
  return Response.json({
    google: Boolean(google.clientId && google.clientSecret),
    microsoft: Boolean(microsoft.clientId && microsoft.clientSecret),
  }, { headers: { "Cache-Control": "no-store" } });
}
