import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { adminAuditEvents, adminContent } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const allowedKeys = new Set(["platform-settings", "notification-settings", "answer-overrides", "custom-questions", "prize-settings"]);

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current || current.user.role !== "admin") return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!allowedKeys.has(key)) return Response.json({ error: "უცნობი პარამეტრი" }, { status: 400 });
  const [row] = await getDb().select().from(adminContent).where(eq(adminContent.key, key)).limit(1);
  let value: unknown = null;
  if (row) { try { value = JSON.parse(row.valueJson); } catch { value = null; } }
  return Response.json({ key, value }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const current = await getSessionUser(request);
  if (!current || current.user.role !== "admin") return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const body = await request.json() as { key?: string; value?: unknown };
  const key = body.key ?? "";
  if (!allowedKeys.has(key) || body.value === undefined) return Response.json({ error: "არასწორი პარამეტრი" }, { status: 400 });
  const valueJson = JSON.stringify(body.value);
  if (valueJson.length > 500_000) return Response.json({ error: "მონაცემი ზედმეტად დიდია" }, { status: 413 });
  const now = new Date();
  await getDb().insert(adminContent).values({ key, valueJson, updatedBy: current.user.id, updatedAt: now })
    .onConflictDoUpdate({ target: adminContent.key, set: { valueJson, updatedBy: current.user.id, updatedAt: now } });
  await getDb().insert(adminAuditEvents).values({ id: crypto.randomUUID(), adminId: current.user.id, action: "პარამეტრის განახლება", details: key, createdAt: now });
  return Response.json({ ok: true });
}
