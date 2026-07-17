CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by` text NOT NULL,
	`test_id` text NOT NULL,
	`grade` text NOT NULL,
	`deadline` text,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
