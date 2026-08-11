import { and, eq, gt } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { guardianConsentRequests, users } from "@/db/schema";
import { sha256 } from "@/lib/auth";

function page(message: string, form = "") {
  return new Response(`<!doctype html><html lang="ka"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>EduTest.ge — თანხმობა</title><style>body{font-family:system-ui;background:#eef2ff;margin:0;display:grid;place-items:center;min-height:100vh}.card{background:white;max-width:520px;margin:20px;padding:28px;border-radius:18px;box-shadow:0 18px 50px #1e3a8a22}button{background:#2563eb;color:white;border:0;border-radius:10px;padding:12px 18px;font-weight:700}</style><main class="card"><h1>EduTest.ge</h1><p>${message}</p>${form}</main></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token.length < 20) return page("ბმული არასწორია ან არასრულია.");
  const safeToken = token.replace(/[^A-Za-z0-9_-]/g, "");
  return page("თუ თქვენ ხართ ბავშვის მშობელი ან კანონიერი წარმომადგენელი და ეთანხმებით EduTest.ge-ის წესებსა და კონფიდენციალურობის პოლიტიკას, დაადასტურეთ თანხმობა.", `<form method="post"><input type="hidden" name="token" value="${safeToken}"><button type="submit">ვეთანხმები და ვადასტურებ</button></form>`);
}

export async function POST(request: Request) {
  await ensureSchema();
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  if (token.length < 20) return page("ბმული არასწორია ან არასრულია.");
  const hash = await sha256(token);
  const db = getDb();
  const [consent] = await db.select().from(guardianConsentRequests).where(and(eq(guardianConsentRequests.tokenHash, hash), eq(guardianConsentRequests.status, "pending"), gt(guardianConsentRequests.expiresAt, new Date()))).limit(1);
  if (!consent) return page("ბმული ვადაგასულია ან უკვე გამოყენებულია.");
  const now = new Date();
  await db.batch([
    db.update(guardianConsentRequests).set({ status: "accepted", acceptedAt: now }).where(eq(guardianConsentRequests.id, consent.id)),
    db.update(users).set({ guardianVerifiedAt: now, updatedAt: now }).where(eq(users.id, consent.childUserId)),
  ]);
  return page("თანხმობა წარმატებით დადასტურდა. ბავშვს ახლა შეუძლია EduTest.ge-ის გამოყენება. ეს გვერდი შეგიძლიათ დახუროთ.");
}
