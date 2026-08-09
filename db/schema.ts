import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

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
}, (table) => [index("idx_attempts_user_submitted").on(table.userId, table.submittedAt)]);

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

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStartedAt: integer("window_started_at").notNull(),
  requestCount: integer("request_count").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const issueReports = sqliteTable("issue_reports", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  testId: text("test_id").notNull(),
  testTitle: text("test_title").notNull(),
  questionId: text("question_id").notNull(),
  questionText: text("question_text").notNull(),
  type: text("type").notNull(),
  comment: text("comment").notNull().default(""),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_issue_reports_resolved_created").on(table.resolved, table.createdAt)]);

export const adminAuditEvents = sqliteTable("admin_audit_events", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  details: text("details").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_admin_audit_created").on(table.createdAt)]);

export const adminContent = sqliteTable("admin_content", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedBy: text("updated_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const customTests = sqliteTable("custom_tests", {
  id: text("id").primaryKey(),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  grade: integer("grade").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  attemptsAllowed: integer("attempts_allowed").notNull(),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  questionsJson: text("questions_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("idx_custom_tests_creator").on(table.createdBy),
  index("idx_custom_tests_published_grade").on(table.published, table.grade),
]);

/** Public assessment material. This table never contains answer keys. */
export const assessmentQuestions = sqliteTable("assessment_questions", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  poolKey: text("pool_key").notNull(),
  poolPrefix: text("pool_prefix").notNull(),
  grade: integer("grade").notNull(),
  subject: text("subject").notNull(),
  sourceSubject: text("source_subject").notNull(),
  semester: integer("semester").notNull(),
  topic: text("topic").notNull(),
  strand: text("strand"),
  questionType: text("question_type").notNull(),
  publicPayloadJson: text("public_payload_json").notNull(),
  points: integer("points").notNull(),
  difficulty: text("difficulty"),
  reviewStatus: text("review_status").notNull(),
  mappingStatus: text("mapping_status").notNull(),
  semanticGroupId: text("semantic_group_id").notNull(),
  contentHash: text("content_hash").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  importedAt: integer("imported_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("assessment_questions_source_unique").on(table.sourceId),
  index("idx_assessment_questions_catalog").on(table.grade, table.subject, table.semester, table.active),
  index("idx_assessment_questions_semantic").on(table.semanticGroupId),
]);

/** Authoritative answers. Only Worker code reads this table. */
export const assessmentAnswerKeys = sqliteTable("assessment_answer_keys", {
  questionId: text("question_id").primaryKey().references(() => assessmentQuestions.id, { onDelete: "cascade" }),
  answerKeyJson: text("answer_key_json").notNull(),
  explanation: text("explanation").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const assessmentTests = sqliteTable("assessment_tests", {
  id: text("id").primaryKey(),
  sourceTestId: text("source_test_id"),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  grade: integer("grade").notNull(),
  semester: integer("semester"),
  sourcePool: text("source_pool").notNull(),
  questionCount: integer("question_count").notNull(),
  timeMinutes: integer("time_minutes").notNull(),
  attemptsAllowed: integer("attempts_allowed").notNull(),
  testType: text("test_type").notNull(),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  isCustom: integer("is_custom", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("idx_assessment_tests_catalog").on(table.published, table.grade, table.subject),
  index("idx_assessment_tests_creator").on(table.createdBy),
]);

export const assessmentTestQuestions = sqliteTable("assessment_test_questions", {
  testId: text("test_id").notNull().references(() => assessmentTests.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull().references(() => assessmentQuestions.id, { onDelete: "restrict" }),
  position: integer("position").notNull(),
}, (table) => [
  primaryKey({ columns: [table.testId, table.questionId] }),
  index("idx_assessment_test_questions_position").on(table.testId, table.position),
]);

export const assessmentSessions = sqliteTable("assessment_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  testId: text("test_id").notNull().references(() => assessmentTests.id, { onDelete: "cascade" }),
  questionIdsJson: text("question_ids_json").notNull(),
  presentationJson: text("presentation_json").notNull(),
  status: text("status").notNull().default("started"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
}, (table) => [index("idx_assessment_sessions_user_status").on(table.userId, table.status, table.startedAt)]);

export const assessmentQuestionHistory = sqliteTable("assessment_question_history", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull().references(() => assessmentQuestions.id, { onDelete: "cascade" }),
  semanticGroupId: text("semantic_group_id").notNull(),
  answeredCount: integer("answered_count").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  lastCorrect: integer("last_correct", { mode: "boolean" }).notNull().default(false),
  lastAnsweredAt: integer("last_answered_at", { mode: "timestamp_ms" }).notNull(),
  nextReviewAt: integer("next_review_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.questionId] }),
  index("idx_assessment_history_review").on(table.userId, table.nextReviewAt, table.lastAnsweredAt),
  index("idx_assessment_history_semantic").on(table.userId, table.semanticGroupId),
]);

export const assessmentImportRuns = sqliteTable("assessment_import_runs", {
  id: text("id").primaryKey(),
  sourceHash: text("source_hash").notNull(),
  sourceQuestions: integer("source_questions").notNull(),
  importedQuestions: integer("imported_questions").notNull(),
  importedTests: integer("imported_tests").notNull(),
  reportJson: text("report_json").notNull(),
  importedAt: integer("imported_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("assessment_import_source_unique").on(table.sourceHash)]);
