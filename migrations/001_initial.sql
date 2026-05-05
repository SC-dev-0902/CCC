-- CCC v1.1 - Initial schema
-- All tables use IF NOT EXISTS so this file is safe to re-run

CREATE TABLE IF NOT EXISTS `users` (
  `id`            CHAR(36)      NOT NULL,
  `username`      VARCHAR(100)  NOT NULL,
  `password_hash` VARCHAR(255)  NOT NULL,
  `role`          ENUM('admin', 'developer') NOT NULL DEFAULT 'developer',
  `created_at`    DATETIME      NOT NULL DEFAULT NOW(),
  `last_login`    DATETIME      NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `projects` (
  `id`              CHAR(36)      NOT NULL,
  `name`            VARCHAR(255)  NOT NULL,
  `path`            VARCHAR(512)  NOT NULL,
  `parent_id`       CHAR(36)      NULL,
  `group_name`      VARCHAR(100)  NOT NULL,
  `sort_order`      INT           NOT NULL DEFAULT 0,
  `type`            ENUM('code', 'config') NOT NULL DEFAULT 'code',
  `active_version`  VARCHAR(20)   NULL,
  `evaluated`       BOOLEAN       NOT NULL DEFAULT FALSE,
  `lock_user_id`    CHAR(36)      NULL,
  `lock_session_id` CHAR(36)      NULL,
  `created_at`      DATETIME      NOT NULL DEFAULT NOW(),
  `updated_at`      DATETIME      NULL ON UPDATE NOW(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_projects_parent`    FOREIGN KEY (`parent_id`)    REFERENCES `projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_projects_lock_user` FOREIGN KEY (`lock_user_id`) REFERENCES `users`    (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Note: lock_session_id has no formal FK - avoids circular dependency with sessions table.

CREATE TABLE IF NOT EXISTS `project_core_files` (
  `project_id` CHAR(36)                              NOT NULL,
  `file_type`  ENUM('claude', 'concept', 'tasklist') NOT NULL,
  `file_path`  VARCHAR(512)                          NOT NULL,
  PRIMARY KEY (`project_id`, `file_type`),
  CONSTRAINT `fk_pcf_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id`         CHAR(36)                          NOT NULL,
  `project_id` CHAR(36)                          NOT NULL,
  `user_id`    CHAR(36)                          NULL,
  `status`     ENUM('active', 'exited', 'error') NOT NULL DEFAULT 'active',
  `started_at` DATETIME                          NOT NULL DEFAULT NOW(),
  `ended_at`   DATETIME                          NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sessions_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sessions_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`    (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `settings` (
  `key`   VARCHAR(100) NOT NULL,
  `value` TEXT         NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `project_integrations` (
  `project_id`  CHAR(36)    NOT NULL,
  `integration` VARCHAR(50) NOT NULL,
  `config`      JSON        NULL,
  `enabled`     BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`project_id`, `integration`),
  CONSTRAINT `fk_pi_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
