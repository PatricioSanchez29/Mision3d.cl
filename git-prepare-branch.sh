#!/usr/bin/env bash
# git-prepare-branch.sh
# Usage: run from the repository root: ./git-prepare-branch.sh my-branch-name "Commit message"

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <branch-name> [commit-message]"
  exit 1
fi

BRANCH=$1
MSG=${2:-"chore: changes from copilot assistant"}

echo ">> Creating branch: $BRANCH"
git checkout -b "$BRANCH"

echo ">> Staging all changes"
git add -A

echo ">> Committing: $MSG"
git commit -m "$MSG"

read -p "Push branch to origin now? (y/N): " PUSH
if [[ "$PUSH" =~ ^[Yy]$ ]]; then
  git push -u origin "$BRANCH"
  echo "Pushed to origin/$BRANCH"
else
  echo "Branch created locally: $BRANCH"
fi

echo "Done."
