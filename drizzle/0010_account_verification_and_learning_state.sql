CREATE TABLE IF NOT EXISTS `email_verification_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `email_verification_token_unique` ON `email_verification_requests` (`token_hash`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_email_verification_user_expires` ON `email_verification_requests` (`user_id`,`expires_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_learning_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`state_json` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
