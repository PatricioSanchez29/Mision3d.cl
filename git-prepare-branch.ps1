<#
  git-prepare-branch.ps1
  PowerShell version: run from repo root: .\git-prepare-branch.ps1 -BranchName feature/mi-branch -Message "Commit message"
#>

param(
  [Parameter(Mandatory=$true)][string]$BranchName,
  [string]$Message = "chore: changes from copilot assistant",
  [switch]$Push
)

Write-Host "Creating branch $BranchName..."
git checkout -b $BranchName

Write-Host "Staging all changes..."
git add -A

Write-Host "Committing: $Message"
git commit -m $Message

if ($Push) {
  Write-Host "Pushing to origin/$BranchName..."
  git push -u origin $BranchName
} else {
  $ans = Read-Host "Push branch to origin now? (y/N)"
  if ($ans -match '^[Yy]') { git push -u origin $BranchName }
}

Write-Host "Done."
