CREATE TABLE `oauth_link_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_subject` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_link_requests_token_unique` ON `oauth_link_requests` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `idx_oauth_link_requests_user_expires` ON `oauth_link_requests` (`user_id`,`expires_at`);
--> statement-breakpoint
CREATE TABLE `password_reset_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_requests_token_unique` ON `password_reset_requests` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `idx_password_reset_requests_user_expires` ON `password_reset_requests` (`user_id`,`expires_at`);
