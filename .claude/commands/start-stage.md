Begin a new stage. Reads the kickoff prompt and executes it.

Instructions:
1. Read CLAUDE.md to refresh project identity, stack, and standing rules
2. Read the tasklist to confirm the current stage number and that the previous stage has a Go
3. Look for the stage kickoff prompt: `docs/handoff/stage{XX}-prompt.md`
   - If it exists: read it completely. This is your approved plan. Begin executing immediately.
   - If it does not exist: STOP. Inform the developer: "No kickoff prompt found for Stage {XX}. Cowork needs to produce this before I can start."
4. Execute all tasks in the kickoff prompt autonomously. Work through them one by one without asking for permission at each step.
5. Only stop and ask when you encounter genuine ambiguity — something the kickoff prompt doesn't cover, contradicts itself, or where a decision could go multiple ways.

The kickoff prompt IS the approval. Do NOT ask "shall I proceed?" or "can I start coding?" — just build what it says. When all tasks are complete, report what was built and present the acceptance criteria results.

IMPORTANT: You do NOT create your own stage plan. You do NOT interpret the concept doc to decide what to build. The kickoff prompt is the instruction. If it is missing, the stage cannot start.
