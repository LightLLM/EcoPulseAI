# Push to GitHub - Quick Guide

## Option 1: Using PowerShell Script (Windows)

```powershell
# Replace YOUR_USERNAME and REPO_NAME with your values
# Replace YOUR_TOKEN with your GitHub personal access token
.\scripts\push-to-github.ps1 -GitHubUsername "YOUR_USERNAME" -RepositoryName "EcoPulseAI" -Token "YOUR_TOKEN"
```

## Option 2: Manual Commands

### Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `EcoPulseAI` (or your preferred name)
3. Choose Public or Private
4. **DO NOT** initialize with README, .gitignore, or license
5. Click "Create repository"

### Step 2: Push Using Token

**Windows (PowerShell):**
```powershell
# Set branch to main
git branch -M main

# Add remote (replace YOUR_USERNAME, REPO_NAME, and YOUR_TOKEN)
$token = "YOUR_TOKEN"
git remote add origin "https://${token}@github.com/YOUR_USERNAME/REPO_NAME.git"

# Push
git push -u origin main
```

**Linux/Mac:**
```bash
# Set branch to main
git branch -M main

# Add remote (replace YOUR_USERNAME, REPO_NAME, and YOUR_TOKEN)
git remote add origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/REPO_NAME.git

# Push
git push -u origin main
```

## Option 3: Using GitHub CLI

```bash
# Install GitHub CLI if not installed
# Then:
gh repo create EcoPulseAI --public --source=. --remote=origin --push
```

## After Pushing

1. ✅ Go to your repository on GitHub
2. ✅ Click "Code" → "Codespaces" → "Create codespace"
3. ✅ Wait ~2-3 minutes for setup
4. ✅ Run: `export MOCK=1 && npm run dev:all`
5. ✅ Access dashboard on forwarded port 5173

## Security Note

⚠️ **Important**: The token is visible in your command history. After pushing:
- Consider revoking this token and creating a new one
- Use GitHub CLI or credential manager for future pushes
- Never commit the token to the repository

## Troubleshooting

### "Repository not found"
- Check repository name and username are correct
- Verify token has `repo` scope

### "Authentication failed"
- Token may be expired or invalid
- Generate a new token at: https://github.com/settings/tokens

### "Remote already exists"
```bash
git remote remove origin
# Then add again with correct URL
```

