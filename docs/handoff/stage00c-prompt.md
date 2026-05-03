# Stage 00c — Update Project Root After rsync

The SC-Development files have been rsync'd to the TrueNAS share at /Users/steinhoferm/truenas-tmp. Update CCC to point to the new project root.

## Context
- New project root (Mac, SMB mount): /Users/steinhoferm/truenas-tmp
- Both data/settings.json and .env need updating
- Do not move, delete, or modify any project files — this is path configuration only

## Steps

1. Read data/settings.json. Find the projectRoot field. Record the current value.

2. Update projectRoot in data/settings.json to:
   /Users/steinhoferm/truenas-tmp

3. Update PROJECT_ROOT in .env to:
   PROJECT_ROOT=/Users/steinhoferm/truenas-tmp

4. Spot-check 3 project paths from data/projects.json. For each, resolve:
   /Users/steinhoferm/truenas-tmp + relative path
   Confirm those directories exist on the mounted share (ls each resolved path). Report results.

## Done
Report: old projectRoot, new projectRoot, 3 spot-checked paths and whether each resolved correctly.
Tell Phet: restart CCC and verify all projects load in the treeview.
