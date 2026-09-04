import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { userLearningState } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

function noStore(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
}

function parseState(value: string | undefined) {
  try {
    const parsed = JSON.parse(value ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return noStore({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  await ensureSchema();
  const [row] = await getDb().select().from(userLearningState).where(eq(userLearningState.userId, current.user.id)).limit(1);
  return noStore({ state: parseState(row?.stateJson), updatedAt: row?.updatedAt?.toISOString() ?? null });
}

export async function PUT(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return noStore({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  const rate = await consumeRateLimit(`user-state:${current.user.id}`, 30, 60_000);
  if (!rate.allowed) return noStore({ error: "შენახვის ლიმიტი დროებით ამოიწურა" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = await request.json().catch(() => ({})) as { state?: unknown };
  if (!body.state || typeof body.state !== "object" || Array.isArray(body.state)) return noStore({ error: "არასწორი მონაცემი" }, { status: 400 });
  const encoded = JSON.stringify(body.state);
  if (encoded.length > 100_000) return noStore({ error: "მონაცემი ზედმეტად დიდია" }, { status: 413 });
  const now = new Date();
  await ensureSchema();
  await getDb().insert(userLearningState).values({ userId: current.user.id, stateJson: encoded, updatedAt: now })
    .onConflictDoUpdate({ target: userLearningState.userId, set: { stateJson: encoded, updatedAt: now } });
  return noStore({ ok: true, updatedAt: now.toISOString() });
}
