import { getSessionUser, publicUser } from "@/lib/auth";
export async function GET(request: Request) {
  const current = await getSessionUser(request);
  return current
    ? Response.json({ user: publicUser(current.user), mfa: { required: current.user.role === "admin", verified: current.mfaVerified } }, { headers: { "Cache-Control": "no-store" } })
    : Response.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
