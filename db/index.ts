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
    ]).then(() => undefined).catch(error => { schemaReady = undefined; throw error; });
  }
  return schemaReady;
}
