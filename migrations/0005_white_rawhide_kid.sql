CREATE TABLE `social_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`email` text,
	`display_name` text,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_identities_provider_user_idx` ON `social_identities` (`provider`,`provider_user_id`);--> statement-breakpoint
CREATE INDEX `social_identities_user_id_idx` ON `social_identities` (`user_id`);