CREATE TABLE `assessment_session_drafts` (
	`session_id` text PRIMARY KEY NOT NULL,
	`snapshot_json` text NOT NULL,
	`answers_json` text DEFAULT '{}' NOT NULL,
	`question_index` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`deadline_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `assessment_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `question_review_events` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`content_version` text NOT NULL,
	`reviewer_id` text,
	`decision` text NOT NULL,
	`note` text NOT NULL,
	`reviewed_at` integer NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `assessment_questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_question_review_version` ON `question_review_events` (`question_id`,`reviewed_at`);--> statement-breakpoint
CREATE INDEX `idx_learning_practice_remediation` ON `learning_practice_sessions` (`user_id`,`source_question_id`,`started_at`);