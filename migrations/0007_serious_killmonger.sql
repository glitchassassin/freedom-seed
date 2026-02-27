CREATE TABLE `feature_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`workspace_id` text,
	`enabled` integer NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_flags_key_workspace_idx` ON `feature_flags` (`key`,`workspace_id`);--> statement-breakpoint
CREATE INDEX `feature_flags_workspace_idx` ON `feature_flags` (`workspace_id`);