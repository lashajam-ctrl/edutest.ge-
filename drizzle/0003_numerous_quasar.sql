CREATE TABLE `email_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`purpose` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verifications_token_unique` ON `email_verifications` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_verifications_user_purpose_unique` ON `email_verifications` (`user_id`,`purpose`);--> statement-breakpoint
ALTER TABLE `users` ADD `parent_email` text;--> statement-breakpoint
ALTER TABLE `users` ADD `parent_email_verified` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `result_email_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `parent_result_email_enabled` integer DEFAULT true NOT NULL;