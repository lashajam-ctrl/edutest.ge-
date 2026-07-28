import { env } from "cloudflare:workers";
import { ensureSchema } from "@/db";

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  await ensureSchema();
  const now = Date.now();
  const cutoff = now - windowMs;
  const row = await env.DB.prepare(`
    INSERT INTO rate_limits (key, window_started_at, request_count, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      request_count = CASE WHEN window_started_at < ? THEN 1 ELSE request_count + 1 END,
      window_started_at = CASE WHEN window_started_at < ? THEN ? ELSE window_started_at END,
      updated_at = ?
    RETURNING request_count, window_started_at
  `).bind(key, now, now, cutoff, cutoff, now, now).first<{ request_count: number; window_started_at: number }>();
  const count = Number(row?.request_count ?? limit + 1);
  const startedAt = Number(row?.window_started_at ?? now);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfter: Math.max(1, Math.ceil((startedAt + windowMs - now) / 1000)),
  };
}
