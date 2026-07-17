import { getSessionUser, publicUser } from "@/lib/auth";
export async function GET(request: Request) {
  const current = await getSessionUser(request);
  return current ? Response.json({ user: publicUser(current.user) }) : Response.json({ user: null }, { status: 401 });
}
