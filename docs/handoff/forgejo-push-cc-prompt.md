# CC Prompt: Push CCC to Forgejo and GitHub

## Objective
Push main branch and tags to both Forgejo (origin) and GitHub (github) remotes.

## Remotes
- Forgejo: `http://mcs-git.mcsfam.local:3000/Phet/CCC.git` (origin)
- GitHub: `https://github.com/SC-dev-0902/CCC.git` (github)

## API Token

Read the Forgejo API token from the workspace root `.env` file:

```bash
source /SC-Development/.env
# Use $FORGEJO_TOKEN for all API calls
```

If `FORGEJO_TOKEN` is not set or equals `your-token-here`, STOP and ask Phet to add his token to `/SC-Development/.env`.

## Steps

1. Navigate to the project root: `/sessions/kind-dazzling-ramanujan/mnt/SC-Development/CCC`
2. Verify both remotes exist: `git remote -v` (should show both `origin` and `github`)
3. Push to Forgejo: `git push origin main`
4. Push tags to Forgejo: `git push origin --tags`
5. Push to GitHub: `git push github main`
6. Push tags to GitHub: `git push github --tags`
7. Report status: "CCC pushed to Forgejo and GitHub (main + tags)" or error details

## Rules
- Do NOT create commits
- Do NOT modify any files
- Do NOT rename branches
- Do NOT force push
- Both pushes must succeed (Forgejo and GitHub)
