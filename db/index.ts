import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

let schemaReady: Promise<void> | undefined;

/** Ensures a fresh preview/test database is usable before the first request. */
export function ensureSchema() {
  if (!env.DB) return Promise.reject(new Error("Cloudflare D1 binding `DB` is unavailable."));
  if (!schemaReady) {
    schemaReady = env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY NOT NULL, email text NOT NULL, name text NOT NULL, role text DEFAULT 'student' NOT NULL, grade text, school text, password_hash text, password_salt text, email_verified integer DEFAULT false NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS identities (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE cascade, provider text NOT NULL, provider_subject text NOT NULL, created_at integer NOT NULL)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS identity_provider_subject_unique ON identities (provider, provider_subject)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS sessions (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE cascade, token_hash text NOT NULL, expires_at integer NOT NULL, created_at integer NOT NULL)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_unique ON sessions (token_hash)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS attempts (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE cascade, test_id text NOT NULL, score integer NOT NULL, max_score integer NOT NULL, percentage integer NOT NULL, answers_json text NOT NULL, submitted_at integer NOT NULL)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS assignments (id text PRIMARY KEY NOT NULL, created_by text NOT NULL REFERENCES users(id) ON DELETE cascade, test_id text NOT NULL, grade text NOT NULL, deadline text, note text, created_at integer NOT NULL)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS question_history (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE cascade, question_id text NOT NULL, pool_key text NOT NULL, answered_at integer NOT NULL)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS question_history_user_question_unique ON question_history (user_id, question_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS question_history_user_pool_idx ON question_history (user_id, pool_key)")
      ,env.DB.prepare("CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY NOT NULL, window_started_at integer NOT NULL, request_count integer NOT NULL, updated_at integer NOT NULL)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS issue_reports (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE cascade, test_id text NOT NULL, test_title text NOT NULL, question_id text NOT NULL, question_text text NOT NULL, type text NOT NULL, comment text DEFAULT '' NOT NULL, resolved integer DEFAULT false NOT NULL, resolved_by text REFERENCES users(id) ON DELETE set null, resolved_at integer, created_at integer NOT NULL)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_issue_reports_resolved_created ON issue_reports (resolved, created_at)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_audit_events (id text PRIMARY KEY NOT NULL, admin_id text NOT NULL REFERENCES users(id) ON DELETE cascade, action text NOT NULL, details text DEFAULT '' NOT NULL, created_at integer NOT NULL)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_events (created_at)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_content (key text PRIMARY KEY NOT NULL, value_json text NOT NULL, updated_by text NOT NULL REFERENCES users(id) ON DELETE restrict, updated_at integer NOT NULL)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS custom_tests (id text PRIMARY KEY NOT NULL, created_by text NOT NULL REFERENCES users(id) ON DELETE cascade, title text NOT NULL, subject text NOT NULL, grade integer NOT NULL, duration_minutes integer NOT NULL, attempts_allowed integer NOT NULL, published integer DEFAULT false NOT NULL, questions_json text NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_custom_tests_creator ON custom_tests (created_by)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_custom_tests_published_grade ON custom_tests (published, grade)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_attempts_user_submitted ON attempts (user_id, submitted_at)")
    ]).then(() => undefined).catch(error => { schemaReady = undefined; throw error; });
  }
  return schemaReady;
}
