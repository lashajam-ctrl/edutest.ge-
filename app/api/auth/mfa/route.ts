import { getSessionUser, sha256 } from "@/lib/auth";
import { adminMfaState, beginAdminMfaEnrollment, verifyAdminMfaCode } from "@/lib/admin-mfa";
import { consumeRateLimit } from "@/lib/rate-limit";

function noStore(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
}

export async function GET(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return noStore({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (current.user.role !== "admin") return noStore({ error: "წვდომა აკრძალულია" }, { status: 403 });
  return noStore(await adminMfaState(current));
}

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return noStore({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (current.user.role !== "admin") return noStore({ error: "წვდომა აკრძალულია" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { action?: string; code?: string };
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const limit = await consumeRateLimit(`admin-mfa:${await sha256(`${current.user.id}|${ip}`)}`, 8, 10 * 60_000);
  if (!limit.allowed) return noStore({ error: "ძალიან ბევრი მცდელობაა. სცადეთ მოგვიანებით." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  try {
    if (body.action === "enroll") return noStore(await beginAdminMfaEnrollment(current));
    if (body.action === "verify") {
      const code = String(body.code ?? "").replace(/\D/g, "");
      if (!/^\d{6}$/.test(code)) return noStore({ error: "შეიყვანეთ სწორი 6-ნიშნა კოდი" }, { status: 400 });
      if (!(await verifyAdminMfaCode(current, code))) return noStore({ error: "კოდი არასწორია ან უკვე გამოყენებულია" }, { status: 400 });
      return noStore({ verified: true });
    }
    return noStore({ error: "არასწორი მოქმედება" }, { status: 400 });
  } catch (error) {
    const unavailable = error instanceof Error && error.message.includes("encryption key");
    return noStore({ error: unavailable ? "MFA კონფიგურაცია დროებით მიუწვდომელია" : "MFA მოქმედება ვერ შესრულდა" }, { status: unavailable ? 503 : 500 });
  }
}
