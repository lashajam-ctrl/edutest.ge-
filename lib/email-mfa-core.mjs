export const EMAIL_CODE_TTL_MS = 5 * 60_000;
export class EmailMfaError extends Error {
  constructor(message, status = 400, retryAfter = 0) { super(message); this.status = status; this.retryAfter = retryAfter; }
}

export function randomEmailCode() {
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= 4_294_000_000);
  return String(value[0] % 1_000_000).padStart(6, '0');
}

export async function emailCodeHash(keyMaterial, challenge, code) {
  if (!keyMaterial || keyMaterial.length < 16) throw new EmailMfaError('კოდის დაცვის კონფიგურაცია მიუწვდომელია.', 503);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(keyMaterial), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const input = JSON.stringify(['edutest-email-mfa-v1', challenge.id, challenge.user_id, challenge.session_id, challenge.recipient_email, challenge.factor_updated_at, code]);
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(input));
  return Array.from(new Uint8Array(signed), byte => byte.toString(16).padStart(2, '0')).join('');
}

function maskedEmail(email) {
  const [name, domain] = email.split('@');
  return name.slice(0, 3) + '***@' + domain;
}

// The recipient is provisioned by the site owner, never by a login request.
// A configured recipient is not verified until a correct emailed code is consumed.
export function createEmailMfaService({ db, deliver, hashCode, rateLimit, now = Date.now, generateCode = randomEmailCode }) {
  async function factorFor(current) {
    if (current?.user?.role !== 'admin' || current.user.emailVerified !== true) return null;
    return db.prepare(`SELECT f.recipient_email, f.updated_at, f.confirmed_at FROM admin_mfa_email_factors f
      INNER JOIN users u ON u.id = f.user_id
      WHERE f.user_id = ? AND u.role = 'admin' AND u.email_verified = 1
      AND NOT EXISTS (SELECT 1 FROM admin_mfa_factors t WHERE t.user_id = f.user_id AND t.confirmed_at IS NOT NULL)`)
      .bind(current.user.id).first();
  }
  async function status(current) {
    const factor = await factorFor(current);
    return factor ? { method: 'email', maskedEmail: maskedEmail(factor.recipient_email), emailConfirmed: Boolean(factor.confirmed_at) } : null;
  }
  async function limit(key, count, duration) {
    const result = await rateLimit(key, count, duration);
    if (!result.allowed) throw new EmailMfaError('ძალიან ბევრი მცდელობაა. ცოტა ხანში ხელახლა სცადეთ.', 429, result.retryAfter);
  }
  async function send(current) {
    const factor = await factorFor(current);
    if (!factor) throw new EmailMfaError('ამ ანგარიშისთვის ელფოსტით კოდი არ არის ხელმისაწვდომი.', 403);
    await limit('admin-email-send-minute:' + current.user.id, 1, 60_000);
    await limit('admin-email-send-hour:' + current.user.id, 5, 60 * 60_000);
    const timestamp = now();
    const challenge = { id: crypto.randomUUID(), user_id: current.user.id, session_id: current.sessionId, recipient_email: factor.recipient_email, factor_updated_at: factor.updated_at };
    const code = generateCode(), hash = await hashCode(challenge, code);
    await db.prepare(`INSERT INTO admin_mfa_email_challenges
      (user_id,id,session_id,recipient_email,factor_updated_at,code_hash,attempts,created_at,expires_at,used_at)
      VALUES (?,?,?,?,?,?,0,?,?,NULL)
      ON CONFLICT(user_id) DO UPDATE SET id=excluded.id, session_id=excluded.session_id,
      recipient_email=excluded.recipient_email, factor_updated_at=excluded.factor_updated_at,
      code_hash=excluded.code_hash, attempts=0, created_at=excluded.created_at, expires_at=excluded.expires_at, used_at=NULL`)
      .bind(challenge.user_id, challenge.id, challenge.session_id, challenge.recipient_email, challenge.factor_updated_at, hash, timestamp, timestamp + EMAIL_CODE_TTL_MS).run();
    try { await deliver(challenge.recipient_email, code); }
    catch {
      await db.prepare('UPDATE admin_mfa_email_challenges SET used_at = ? WHERE user_id = ? AND id = ?').bind(now(), current.user.id, challenge.id).run();
      throw new EmailMfaError('წერილი ვერ გაიგზავნა. ერთი წუთის შემდეგ ხელახლა სცადეთ.', 502);
    }
    return { sent: true, maskedEmail: maskedEmail(challenge.recipient_email), expiresIn: EMAIL_CODE_TTL_MS / 1000, resendAfter: 60 };
  }
  async function verify(current, code) {
    if (!/^\d{6}$/.test(code)) return false;
    const factor = await factorFor(current);
    if (!factor) return false;
    await limit('admin-email-verify:' + current.user.id, 10, 10 * 60_000);
    const challenge = await db.prepare('SELECT * FROM admin_mfa_email_challenges WHERE user_id = ? AND session_id = ?')
      .bind(current.user.id, current.sessionId).first();
    if (!challenge) return false;
    const timestamp = now(), hash = await hashCode(challenge, code);
    // D1 batch is transactional. changes() ties the session grant to exactly
    // one successful consumption, so replay/concurrent verification cannot win twice.
    const results = await db.batch([
      db.prepare(`UPDATE admin_mfa_email_challenges SET attempts = attempts + 1
        WHERE user_id = ? AND id = ? AND session_id = ? AND used_at IS NULL AND expires_at > ? AND attempts < 5`)
        .bind(current.user.id, challenge.id, current.sessionId, timestamp),
      db.prepare(`UPDATE admin_mfa_email_challenges SET used_at = ?
        WHERE changes() = 1 AND user_id = ? AND id = ? AND session_id = ? AND code_hash = ?
        AND used_at IS NULL AND expires_at > ? AND attempts <= 5
        AND EXISTS (SELECT 1 FROM admin_mfa_email_factors f INNER JOIN users u ON u.id=f.user_id
          WHERE f.user_id=admin_mfa_email_challenges.user_id AND f.recipient_email=admin_mfa_email_challenges.recipient_email
          AND f.updated_at=admin_mfa_email_challenges.factor_updated_at AND u.role='admin' AND u.email_verified=1)
        AND EXISTS (SELECT 1 FROM sessions s WHERE s.id=admin_mfa_email_challenges.session_id AND s.user_id=admin_mfa_email_challenges.user_id AND s.expires_at > ?)
        AND NOT EXISTS (SELECT 1 FROM admin_mfa_factors t WHERE t.user_id=admin_mfa_email_challenges.user_id AND t.confirmed_at IS NOT NULL)`)
        .bind(timestamp, current.user.id, challenge.id, current.sessionId, hash, timestamp, timestamp),
      db.prepare(`INSERT INTO session_mfa_verifications (session_id,verified_at,expires_at)
        SELECT ?,?,? WHERE changes() = 1
        ON CONFLICT(session_id) DO UPDATE SET verified_at=excluded.verified_at, expires_at=excluded.expires_at`)
        .bind(current.sessionId, timestamp, timestamp + 12 * 60 * 60_000),
      db.prepare(`UPDATE admin_mfa_email_factors SET confirmed_at=COALESCE(confirmed_at,?)
        WHERE changes() = 1 AND user_id = ? AND recipient_email = ? AND updated_at = ?`)
        .bind(timestamp, current.user.id, challenge.recipient_email, challenge.factor_updated_at),
    ]);
    return Number(results[1]?.meta?.changes) === 1;
  }
  return { status, send, verify };
}
