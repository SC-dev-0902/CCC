-- CCC v1.1 - Fix: projects.group_name must allow NULL for sub-projects
ALTER TABLE projects MODIFY COLUMN group_name VARCHAR(100) NULL;
