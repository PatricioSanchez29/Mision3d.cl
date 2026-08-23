COMMIT and BRANCH instructions
===============================

I added helper scripts to create a Git branch and commit the current changes.

Files added:
- `git-prepare-branch.sh` — bash script (Linux/macOS, WSL, Git Bash on Windows)
- `git-prepare-branch.ps1` — PowerShell script (Windows PowerShell / PowerShell Core)

Usage (choose one):

Bash:
```bash
# from repository root
chmod +x ./git-prepare-branch.sh
./git-prepare-branch.sh feature/analytics-setup "feat: add analytics + dashboard improvements"
```

PowerShell:
```powershell
# from repository root
.\git-prepare-branch.ps1 -BranchName feature/analytics-setup -Message "feat: add analytics + dashboard improvements"
```

Both scripts will:
- create a new branch with the name you provide
- stage all modifications (`git add -A`)
- commit with the message you provide (default: `chore: changes from copilot assistant`)
- optionally push to `origin` if you confirm

Security note: ensure your `.env` file is not accidentally committed. If you have a `.env` file, run:

```bash
git restore --staged backend/.env || true
```

If you want, puedo also create the branch name for you suggestion. Tell me the branch name to use or run the script locally.

Suggested branch name and commit message (recomendado):

- Branch: `feature/analytics-dashboard`
- Commit message: `feat(analytics): add server-side GA events, debug endpoints, and dashboard fixes`

Ejecuta (PowerShell):
```powershell
.\git-prepare-branch.ps1 -BranchName feature/analytics-dashboard -Message "feat(analytics): add server-side GA events, debug endpoints, and dashboard fixes" -Push
```

O (bash):
```bash
./git-prepare-branch.sh feature/analytics-dashboard "feat(analytics): add server-side GA events, debug endpoints, and dashboard fixes"
```
