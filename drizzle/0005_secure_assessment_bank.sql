CREATE TABLE IF NOT EXISTS `assessment_questions` (
  `id` text PRIMARY KEY NOT NULL,
  `source_id` text NOT NULL UNIQUE,
  `pool_key` text NOT NULL,
  `pool_prefix` text NOT NULL,
  `grade` integer NOT NULL,
  `subject` text NOT NULL,
  `source_subject` text NOT NULL,
  `semester` integer NOT NULL,
  `topic` text NOT NULL,
  `strand` text,
  `question_type` text NOT NULL,
  `public_payload_json` text NOT NULL,
  `points` integer NOT NULL,
  `difficulty` text,
  `review_status` text NOT NULL,
  `mapping_status` text NOT NULL,
  `semantic_group_id` text NOT NULL,
  `content_hash` text NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `imported_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_assessment_questions_catalog` ON `assessment_questions` (`grade`,`subject`,`semester`,`active`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_assessment_questions_semantic` ON `assessment_questions` (`semantic_group_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `assessment_answer_keys` (`question_id` text PRIMARY KEY NOT NULL, `answer_key_json` text NOT NULL, `explanation` text DEFAULT '' NOT NULL, `updated_at` integer NOT NULL, FOREIGN KEY (`question_id`) REFERENCES `assessment_questions`(`id`) ON DELETE cascade);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `assessment_tests` (`id` text PRIMARY KEY NOT NULL, `source_test_id` text, `title` text NOT NULL, `subject` text NOT NULL, `grade` integer NOT NULL, `semester` integer, `source_pool` text NOT NULL, `question_count` integer NOT NULL, `time_minutes` integer NOT NULL, `attempts_allowed` integer NOT NULL, `test_type` text NOT NULL, `published` integer DEFAULT false NOT NULL, `is_custom` integer DEFAULT false NOT NULL, `created_by` text, `created_at` integer NOT NULL, `updated_at` integer NOT NULL, FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_assessment_tests_catalog` ON `assessment_tests` (`published`,`grade`,`subject`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_assessment_tests_creator` ON `assessment_tests` (`created_by`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `assessment_test_questions` (`test_id` text NOT NULL, `question_id` text NOT NULL, `position` integer NOT NULL, PRIMARY KEY (`test_id`,`question_id`), FOREIGN KEY (`test_id`) REFERENCES `assessment_tests`(`id`) ON DELETE cascade, FOREIGN KEY (`question_id`) REFERENCES `assessment_questions`(`id`) ON DELETE restrict);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_assessment_test_questions_position` ON `assessment_test_questions` (`test_id`,`position`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `assessment_sessions` (`id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `test_id` text NOT NULL, `question_ids_json` text NOT NULL, `presentation_json` text NOT NULL, `status` text DEFAULT 'started' NOT NULL, `started_at` integer NOT NULL, `expires_at` integer NOT NULL, `submitted_at` integer, FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade, FOREIGN KEY (`test_id`) REFERENCES `assessment_tests`(`id`) ON DELETE cascade);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_assessment_sessions_user_status` ON `assessment_sessions` (`user_id`,`status`,`started_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `assessment_question_history` (`user_id` text NOT NULL, `question_id` text NOT NULL, `semantic_group_id` text NOT NULL, `answered_count` integer DEFAULT 0 NOT NULL, `correct_count` integer DEFAULT 0 NOT NULL, `last_correct` integer DEFAULT false NOT NULL, `last_answered_at` integer NOT NULL, `next_review_at` integer NOT NULL, PRIMARY KEY (`user_id`,`question_id`), FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade, FOREIGN KEY (`question_id`) REFERENCES `assessment_questions`(`id`) ON DELETE cascade);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_assessment_history_review` ON `assessment_question_history` (`user_id`,`next_review_at`,`last_answered_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_assessment_history_semantic` ON `assessment_question_history` (`user_id`,`semantic_group_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `assessment_import_runs` (`id` text PRIMARY KEY NOT NULL, `source_hash` text NOT NULL UNIQUE, `source_questions` integer NOT NULL, `imported_questions` integer NOT NULL, `imported_tests` integer NOT NULL, `report_json` text NOT NULL, `imported_at` integer NOT NULL);
