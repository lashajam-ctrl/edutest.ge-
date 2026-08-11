import { getSessionUser } from "@/lib/auth";
import { resendLatestGuardianConsent } from "@/lib/guardian-consent";

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });
  if (current.user.role !== "student" || current.user.guardianVerifiedAt) return Response.json({ error: "თანხმობის მოთხოვნა არ არის საჭირო" }, { status: 400 });
  try {
    await resendLatestGuardianConsent(request, current.user);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "წერილის გაგზავნა დროებით ვერ მოხერხდა" }, { status: 502 });
  }
}
