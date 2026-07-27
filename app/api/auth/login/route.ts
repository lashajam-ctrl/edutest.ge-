import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession, publicUser, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json() as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  const valid = user?.passwordHash && user.passwordSalt ? await verifyPassword(body.password ?? "", user.passwordSalt, user.passwordHash) : false;
  if (!user || !valid) return Response.json({ error: "ელფოსტა ან პაროლი არასწორია" }, { status: 401 });
  const session = await createSession(user.id, request);
  return Response.json({ user: publicUser(user) }, { headers: { "Set-Cookie": session.cookie } });
}
