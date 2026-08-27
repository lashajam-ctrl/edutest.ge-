CREATE TABLE IF NOT EXISTS `admin_mfa_factors` (
	`user_id` text PRIMARY KEY NOT NULL,
	`encrypted_secret` text NOT NULL,
	`confirmed_at` integer,
	`last_used_counter` integer DEFAULT -1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `session_mfa_verifications` (
	`session_id` text PRIMARY KEY NOT NULL,
	`verified_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_session_mfa_expires` ON `session_mfa_verifications` (`expires_at`);
