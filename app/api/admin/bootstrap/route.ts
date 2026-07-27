import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, sha256 } from "@/lib/auth";

type BootstrapRole = "student" | "teacher" | "admin";

async function sameSecret(received: string, expected: string) {
  const [left, right] = await Promise.all([sha256(received), sha256(expected)]);
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

export async function POST(request: Request) {
  const runtime = env as unknown as Record<string, string>;
  const expected = runtime.ADMIN_BOOTSTRAP_TOKEN?.trim();
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !received || !(await sameSecret(received, expected))) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json() as { accounts?: Array<{ email?: string; password?: string; name?: string; role?: BootstrapRole; grade?: string; school?: string }> };
  const accounts = Array.isArray(body.accounts) ? body.accounts.slice(0, 5) : [];
  if (!accounts.length) return Response.json({ error: "No accounts supplied" }, { status: 400 });

  await ensureSchema();
  const db = getDb();
  const created: Array<{ email: string; role: BootstrapRole }> = [];
  for (const account of accounts) {
    const email = (account.email ?? "").trim().toLowerCase();
    const password = account.password ?? "";
    const name = (account.name ?? "").trim();
    const role: BootstrapRole = account.role === "admin" || account.role === "teacher" ? account.role : "student";
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 14 || !name) return Response.json({ error: `Invalid bootstrap account: ${email || "unknown"}` }, { status: 400 });
    const passwordData = await hashPassword(password);
    const now = new Date();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    const values = { name, role, grade: role === "student" ? account.grade || null : null, school: account.school || null, passwordHash: passwordData.hash, passwordSalt: passwordData.salt, emailVerified: true, updatedAt: now };
    if (existing) await db.update(users).set(values).where(eq(users.id, existing.id));
    else await db.insert(users).values({ id: crypto.randomUUID(), email, ...values, createdAt: now });
    created.push({ email, role });
  }
  return Response.json({ accounts: created }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
