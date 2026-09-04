import { env } from "cloudflare:workers";
import type { users } from "@/db/schema";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export async function sendAssessmentResultEmail(user: typeof users.$inferSelect, result: { title: string; subject: string; grade: number | null; correct: number; total: number; pct: number }) {
  const runtime = env as unknown as Record<string, string>;
  if (!runtime.RESEND_API_KEY || !user.emailVerified) return false;
  const recipients = new Set<string>([user.email]);
  if (user.guardianVerifiedAt && user.guardianEmail) recipients.add(user.guardianEmail);
  const gradeText = result.grade ? `${result.grade} კლასი` : "";
  const summary = `${result.title}: ${result.correct}/${result.total} სწორი პასუხი — ${result.pct}%`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${runtime.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "EduTest.ge <results@edutest.ge>",
      to: [...recipients],
      subject: `EduTest.ge — ტესტის შედეგი: ${result.pct}%`,
      text: `${user.name}, დასრულდა ტესტი „${result.title}“ (${result.subject}${gradeText ? `, ${gradeText}` : ""}).\n${summary}\n\nდეტალური ახსნა ხელმისაწვდომია EduTest.ge-ზე, თქვენს ანგარიშში.`,
      html: `<p>გამარჯობა, ${escapeHtml(user.name)}.</p><p>დასრულდა ტესტი <strong>„${escapeHtml(result.title)}“</strong> (${escapeHtml(result.subject)}${gradeText ? `, ${escapeHtml(gradeText)}` : ""}).</p><p><strong>${result.correct}/${result.total}</strong> სწორი პასუხი — <strong>${result.pct}%</strong>.</p><p>დეტალური ახსნა ხელმისაწვდომია EduTest.ge-ზე, თქვენს ანგარიშში.</p>`,
    }),
  });
  return response.ok;
}
