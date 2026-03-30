# CCC v1.0.6 — Stage 01 Test Checklist

---

## Item 1: Non-Code Project Support

- [x] Open CCC in the browser. Click the **+** button to open the New Project wizard.
- [x] In the wizard, you see a **Project Type** dropdown with two options: **Code** and **Config**. Code is selected by default.
- [x] Enter a project name, select **Config** as the type, choose a location and group, then click **Create**. The project appears in the sidebar with a small **CFG** badge next to the name.
  > Than we have to add a flag 'code' for the other projects, too
- [x] Drag the new Config project from Parked to Active. It moves without any warning or block.
- [x] Right-click or click the edit icon on the Config project. The Edit modal shows a **Project Type** dropdown with **Config** selected. You can change it to **Code** and save.
- [x] Create another project with the default **Code** type. It appears in the sidebar without any CFG badge.
- [x] Verify existing projects (e.g. CCC, PatchPilot) appear and work exactly as before — no CFG badge, no errors, no changes in behaviour.

---

## Item 2: Workflow Enforcement + Slash Command Alignment

- [x] Create a new project via the wizard. After creation, navigate to the project folder on disk. Open `.claude/commands/` — you see 8 command files: `start-stage.md`, `continue.md`, `update-tasklist.md`, `review-concept.md`, `status.md`, `create-tasklist.md`, `eod.md`, `test.md`.
- [x] Open `update-tasklist.md` — it says "Do NOT add new tasks or stages" (not "Add any new tasks").
- [x] Open `start-stage.md` — it references `docs/handoff/stage{XX}-prompt.md` and says to STOP if no kickoff prompt exists.
- [x] Open `create-tasklist.md` — it starts with "DEPRECATED" and says CC does not create tasklists.
- [x] Open `continue.md` — it references kickoff prompts and says to stop without one.
- [x] Import a project. In the import confirmation screen, verify the notices say "It will be scaffolded during import" (for CLAUDE.md) and "The tasklist will be created in a Cowork session after import" (for tasklist). No mention of `/start-project`.
- [x] After import completes, check the imported project's `.claude/commands/` folder — it also has all 8 command files.

---

## Item 3: Test File Version-Aware Placement

- [x] This test file itself is located at `docs/v1.0/v1.0.6/CCC_test_stage01.md` — confirming patch version placement works. Open CCC and expand the CCC project tree. Under v1.0 > v1.0.6, you see this test file listed.
- [x] In the CCC treeview, test files under version folders (both `docs/v1.0/` and `docs/v1.0/v1.0.6/`) appear correctly with their checkbox progress indicators.

---

## Item 4: Project Activation Fix

- [x] Create a new project in CCC (via the wizard). Drag it from Parked to Active — it moves successfully without any warning.
- [x] Import a project into CCC. Try to drag it from Parked to Active — you see a warning: "Run /evaluate-import before moving this project to Active." The project snaps back to Parked.
- [x] Create a Config-type project. Even if it somehow gets `evaluated: false`, drag it from Parked to Active — it moves successfully (config projects bypass the evaluation check).
- [x] Open the Edit modal on an unevaluated imported project. Try to change its group to Active — you see the same evaluation warning. Change its type to Config, save, then try again — it allows the move.
- [x] Verify existing projects with `evaluated: true` work exactly as before — they can be moved between groups freely.

---

## Cross-Cutting

- [x] No JavaScript errors in the browser console after performing all the above actions.
- [x] The CCC sidebar renders correctly — project names, badges, status dots, and chevrons are all properly aligned.
- [x] All modals (New Project, Edit Project, Import) open and close without visual glitches.
- [x] Restarting the CCC server and refreshing the browser — all projects load correctly with their type and evaluated status intact.
