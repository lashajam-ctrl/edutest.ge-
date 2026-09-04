import { getSessionUser, sha256 } from "@/lib/auth";
import { createAndSendEmailVerification } from "@/lib/email-verification";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (current.user.emailVerified) return Response.json({ ok: true, alreadyVerified: true });
  const limit = await consumeRateLimit(`email-verify:${await sha256(current.user.id)}`, 3, 60 * 60_000);
  if (!limit.allowed) return Response.json({ error: "ბმული უკვე გაიგზავნა. ცოტა ხანში ისევ სცადეთ." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  try {
    await createAndSendEmailVerification(request, current.user);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "დადასტურების წერილი დროებით ვერ გაიგზავნა" }, { status: 502 });
  }
}
