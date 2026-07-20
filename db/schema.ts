import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["student", "teacher", "pending_teacher", "admin", "parent"] }).notNull().default("student"),
  grade: text("grade"),
  school: text("school"),
  passwordHash: text("password_hash"),
  passwordSalt: text("password_salt"),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  parentEmail: text("parent_email"),
  parentEmailVerified: integer("parent_email_verified", { mode: "boolean" }).notNull().default(false),
  resultEmailEnabled: integer("result_email_enabled", { mode: "boolean" }).notNull().default(true),
  parentResultEmailEnabled: integer("parent_result_email_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const emailVerifications = sqliteTable("email_verifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  purpose: text("purpose", { enum: ["primary", "parent"] }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("email_verifications_token_unique").on(table.tokenHash),
  uniqueIndex("email_verifications_user_purpose_unique").on(table.userId, table.purpose),
]);

export const identities = sqliteTable("identities", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["google", "microsoft", "facebook"] }).notNull(),
  providerSubject: text("provider_subject").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("identity_provider_subject_unique").on(table.provider, table.providerSubject)]);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("sessions_token_unique").on(table.tokenHash)]);

export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  testId: text("test_id").notNull(),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  percentage: integer("percentage").notNull(),
  answersJson: text("answers_json").notNull(),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).notNull(),
});

export const assignments = sqliteTable("assignments", {
  id: text("id").primaryKey(),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  testId: text("test_id").notNull(),
  grade: text("grade").notNull(),
  deadline: text("deadline"),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const questionHistory = sqliteTable("question_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull(),
  poolKey: text("pool_key").notNull(),
  answeredAt: integer("answered_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("question_history_user_question_unique").on(table.userId, table.questionId),
]);
