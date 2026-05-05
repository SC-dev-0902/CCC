-- Stage 03d01: relax sessions.user_id to nullable (auth wired in Stage 05)
ALTER TABLE sessions MODIFY user_id CHAR(36) NULL;
