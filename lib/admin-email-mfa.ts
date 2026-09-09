import { env } from 'cloudflare:workers';
import { createEmailMfaService, emailCodeHash, EmailMfaError } from '@/lib/email-mfa-core.mjs';
import { consumeRateLimit } from '@/lib/rate-limit';

export { EmailMfaError };

export function adminEmailMfa() {
  const runtime = env as unknown as Record<string, string>;
  return createEmailMfaService({
    db: env.DB,
    hashCode: (challenge: Parameters<typeof emailCodeHash>[1], code: string) => emailCodeHash(runtime.MFA_ENCRYPTION_KEY || runtime.ADMIN_BOOTSTRAP_TOKEN, challenge, code),
    rateLimit: consumeRateLimit,
    deliver: async (recipient: string, code: string) => {
      if (!runtime.RESEND_API_KEY) throw new Error('Email service unavailable');
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${runtime.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'EduTest.ge <results@edutest.ge>', to: [recipient],
          subject: 'EduTest.ge — ადმინისტრატორის შესვლის კოდი',
          text: `ადმინისტრატორის შესვლის ერთჯერადი კოდია: ${code}\n\nკოდი მოქმედებს 5 წუთი და მხოლოდ იმ ბრაუზერში, საიდანაც შესვლა დაიწყეთ. არავის გაუზიაროთ. თუ შესვლა თქვენ არ დაგიწყიათ, შეცვალეთ ანგარიშის პაროლი.`,
        }),
      });
      if (!response.ok) throw new Error('Email delivery failed');
    },
  });
}
