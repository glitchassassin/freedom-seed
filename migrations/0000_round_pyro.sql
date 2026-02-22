CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`target_label` text,
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_team_created_idx` ON `audit_log` (`team_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `password_credentials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`hash` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`email_verified_at` integer,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);