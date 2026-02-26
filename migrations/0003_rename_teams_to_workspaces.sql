ALTER TABLE `teams` RENAME TO `workspaces`;--> statement-breakpoint
ALTER TABLE `team_members` RENAME TO `workspace_members`;--> statement-breakpoint
ALTER TABLE `team_invitations` RENAME TO `workspace_invitations`;--> statement-breakpoint
ALTER TABLE `workspace_members` RENAME COLUMN `team_id` TO `workspace_id`;--> statement-breakpoint
ALTER TABLE `workspace_invitations` RENAME COLUMN `team_id` TO `workspace_id`;--> statement-breakpoint
ALTER TABLE `audit_log` RENAME COLUMN `team_id` TO `workspace_id`;--> statement-breakpoint
DROP INDEX IF EXISTS `team_members_team_user_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_members_workspace_user_idx` ON `workspace_members` (`workspace_id`, `user_id`);--> statement-breakpoint
DROP INDEX IF EXISTS `audit_log_team_created_idx`;--> statement-breakpoint
CREATE INDEX `audit_log_workspace_created_idx` ON `audit_log` (`workspace_id`, `created_at`);
