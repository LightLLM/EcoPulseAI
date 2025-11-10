# PowerShell script to push to GitHub with token
param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername,
    
    [Parameter(Mandatory=$true)]
    [string]$RepositoryName,
    
    [Parameter(Mandatory=$true)]
    [string]$Token
)

Write-Host "🚀 Setting up GitHub remote and pushing..." -ForegroundColor Green

# Set branch to main
git branch -M main

# Add remote with token
$remoteUrl = "https://${Token}@github.com/${GitHubUsername}/${RepositoryName}.git"
git remote add origin $remoteUrl

Write-Host "✅ Remote added" -ForegroundColor Green

# Push to GitHub
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "Repository URL: https://github.com/${GitHubUsername}/${RepositoryName}" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to https://github.com/${GitHubUsername}/${RepositoryName}" -ForegroundColor White
Write-Host "2. Click 'Code' → 'Codespaces' → 'Create codespace'" -ForegroundColor White
Write-Host "3. Wait for setup and run: export MOCK=1 && npm run dev:all" -ForegroundColor White

