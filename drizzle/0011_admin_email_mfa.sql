CREATE TABLE `admin_mfa_email_challenges` (
	`user_id` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`session_id` text NOT NULL,
	`recipient_email` text NOT NULL,
	`factor_updated_at` integer NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `admin_mfa_email_factors` (
	`user_id` text PRIMARY KEY NOT NULL,
	`recipient_email` text NOT NULL,
	`confirmed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
