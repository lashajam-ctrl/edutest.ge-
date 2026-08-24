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
      env.DB.prepare("CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY NOT NULL, email text NOT NULL, name text NOT NULL, role text DEFAULT 'student' NOT NULL, grade text, school text, birth_date text, guardian_email text, guardian_verified_at integer, terms_version text, privacy_version text, profile_completed_at integer, account_status text DEFAULT 'active' NOT NULL, password_hash text, password_salt text, email_verified integer DEFAULT false NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS identities (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE cascade, provider text NOT NULL, provider_subject text NOT NULL, created_at integer NOT NULL)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS identity_provider_subject_unique ON identities (provider, provider_subject)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS sessions (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE cascade, token_hash text NOT NULL, expires_at integer NOT NULL, created_at integer NOT NULL)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_unique ON sessions (token_hash)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS oauth_link_requests (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE cascade, provider text NOT NULL, provider_subject text NOT NULL, token_hash text NOT NULL, expires_at integer NOT NULL, created_at integer NOT NULL)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS oauth_link_requests_token_unique ON oauth_link_requests (token_hash)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_oauth_link_requests_user_expires ON oauth_link_requests (user_id, expires_at)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS password_reset_requests (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE cascade, token_hash text NOT NULL, expires_at integer NOT NULL, used_at integer, created_at integer NOT NULL)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS password_reset_requests_token_unique ON password_reset_requests (token_hash)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_expires ON password_reset_requests (user_id, expires_at)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS guardian_consent_requests (id text PRIMARY KEY NOT NULL, child_user_id text NOT NULL REFERENCES users(id) ON DELETE cascade, guardian_email text NOT NULL, token_hash text NOT NULL, status text DEFAULT 'pending' NOT NULL, expires_at integer NOT NULL, created_at integer NOT NULL, accepted_at integer)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS guardian_consent_token_unique ON guardian_consent_requests (token_hash)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_guardian_consent_child_status ON guardian_consent_requests (child_user_id, status)"),
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
      env.DB.prepare("CREATE TABLE IF NOT EXISTS assessment_questions (id text PRIMARY KEY NOT NULL, source_id text NOT NULL UNIQUE, pool_key text NOT NULL, pool_prefix text NOT NULL, grade integer NOT NULL, subject text NOT NULL, source_subject text NOT NULL, semester integer NOT NULL, topic text NOT NULL, strand text, question_type text NOT NULL, public_payload_json text NOT NULL, points integer NOT NULL, difficulty text, review_status text NOT NULL, mapping_status text NOT NULL, semantic_group_id text NOT NULL, content_hash text NOT NULL, active integer DEFAULT true NOT NULL, imported_at integer NOT NULL, updated_at integer NOT NULL)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_assessment_questions_catalog ON assessment_questions (grade, subject, semester, active)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_assessment_questions_semantic ON assessment_questions (semantic_group_id)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS assessment_answer_keys (question_id text PRIMARY KEY NOT NULL REFERENCES assessment_questions(id) ON DELETE cascade, answer_key_json text NOT NULL, explanation text DEFAULT '' NOT NULL, updated_at integer NOT NULL)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS assessment_tests (id text PRIMARY KEY NOT NULL, source_test_id text, title text NOT NULL, subject text NOT NULL, grade integer NOT NULL, semester integer, source_pool text NOT NULL, question_count integer NOT NULL, time_minutes integer NOT NULL, attempts_allowed integer NOT NULL, test_type text NOT NULL, published integer DEFAULT false NOT NULL, is_custom integer DEFAULT false NOT NULL, created_by text REFERENCES users(id) ON DELETE cascade, created_at integer NOT NULL, updated_at integer NOT NULL)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_assessment_tests_catalog ON assessment_tests (published, grade, subject)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_assessment_tests_creator ON assessment_tests (created_by)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS assessment_test_questions (test_id text NOT NULL REFERENCES assessment_tests(id) ON DELETE cascade, question_id text NOT NULL REFERENCES assessment_questions(id) ON DELETE restrict, position integer NOT NULL, PRIMARY KEY (test_id, question_id))"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_assessment_test_questions_position ON assessment_test_questions (test_id, position)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS assessment_sessions (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES users(id) ON DELETE cascade, test_id text NOT NULL REFERENCES assessment_tests(id) ON DELETE cascade, question_ids_json text NOT NULL, presentation_json text NOT NULL, status text DEFAULT 'started' NOT NULL, started_at integer NOT NULL, expires_at integer NOT NULL, submitted_at integer)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_status ON assessment_sessions (user_id, status, started_at)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS assessment_question_history (user_id text NOT NULL REFERENCES users(id) ON DELETE cascade, question_id text NOT NULL REFERENCES assessment_questions(id) ON DELETE cascade, semantic_group_id text NOT NULL, answered_count integer DEFAULT 0 NOT NULL, correct_count integer DEFAULT 0 NOT NULL, last_correct integer DEFAULT false NOT NULL, last_answered_at integer NOT NULL, next_review_at integer NOT NULL, PRIMARY KEY (user_id, question_id))"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_assessment_history_review ON assessment_question_history (user_id, next_review_at, last_answered_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_assessment_history_semantic ON assessment_question_history (user_id, semantic_group_id)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS assessment_import_runs (id text PRIMARY KEY NOT NULL, source_hash text NOT NULL UNIQUE, source_questions integer NOT NULL, imported_questions integer NOT NULL, imported_tests integer NOT NULL, report_json text NOT NULL, imported_at integer NOT NULL)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_attempts_user_submitted ON attempts (user_id, submitted_at)")
    ]).then(async () => {
      const info = await env.DB.prepare("PRAGMA table_info(users)").all<{ name: string }>();
      const columns = new Set((info.results ?? []).map(row => row.name));
      const additions: Array<[string, string]> = [
        ["birth_date", "text"],
        ["guardian_email", "text"],
        ["guardian_verified_at", "integer"],
        ["terms_version", "text"],
        ["privacy_version", "text"],
        ["profile_completed_at", "integer"],
        ["account_status", "text DEFAULT 'active' NOT NULL"],
      ];
      for (const [name, definition] of additions) {
        if (!columns.has(name)) await env.DB.prepare(`ALTER TABLE users ADD COLUMN ${name} ${definition}`).run();
      }
    }).then(() => undefined).catch(error => { schemaReady = undefined; throw error; });
  }
  return schemaReady;
}
