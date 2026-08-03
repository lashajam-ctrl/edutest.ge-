CREATE INDEX IF NOT EXISTS `idx_attempts_user_submitted` ON `attempts` (`user_id`,`submitted_at`);
