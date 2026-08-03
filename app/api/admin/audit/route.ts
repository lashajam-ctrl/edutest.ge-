import { desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { adminAuditEvents, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "";

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current || current.user.role !== "admin") return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const rows = await getDb().select({ event: adminAuditEvents, adminEmail: users.email })
    .from(adminAuditEvents).innerJoin(users, eq(adminAuditEvents.adminId, users.id)).orderBy(desc(adminAuditEvents.createdAt)).limit(500);
  return Response.json({ events: rows.map(({ event, adminEmail }) => ({ ...event, adminEmail })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current || current.user.role !== "admin") return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  const body = await request.json() as Record<string, unknown>;
  const action = clean(body.action, 120); const details = clean(body.details, 1000);
  if (!action) return Response.json({ error: "მოქმედება სავალდებულოა" }, { status: 400 });
  const event = { id: crypto.randomUUID(), adminId: current.user.id, action, details, createdAt: new Date() };
  await getDb().insert(adminAuditEvents).values(event);
  return Response.json({ event }, { status: 201 });
}

export async function DELETE(request: Request) {
  const current = await getSessionUser(request);
  if (!current || current.user.role !== "admin") return Response.json({ error: "ადმინისტრატორის წვდომაა საჭირო" }, { status: 403 });
  await ensureSchema();
  await getDb().delete(adminAuditEvents);
  await getDb().insert(adminAuditEvents).values({ id: crypto.randomUUID(), adminId: current.user.id, action: "ჟურნალის გასუფთავება", details: "ძველი ჩანაწერები წაიშალა", createdAt: new Date() });
  return Response.json({ ok: true });
}
