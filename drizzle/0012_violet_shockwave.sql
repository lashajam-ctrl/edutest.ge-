CREATE TABLE `learning_practice_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_question_id` text NOT NULL,
	`question_id` text NOT NULL,
	`presentation_json` text NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`started_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`submitted_at` integer,
	`result_json` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_question_id`) REFERENCES `assessment_questions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`question_id`) REFERENCES `assessment_questions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_learning_practice_user` ON `learning_practice_sessions` (`user_id`,`started_at`);