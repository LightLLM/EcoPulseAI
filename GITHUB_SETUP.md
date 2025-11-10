# GitHub Repository Setup Guide

This guide will help you set up the EcoPulse.AI repository on GitHub with Codespaces and CI/CD.

## 1. Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon → "New repository"
3. Name it: `EcoPulseAI` (or your preferred name)
4. Choose visibility (Public recommended for hackathon)
5. **Do NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## 2. Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: EcoPulse.AI full-stack application"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/EcoPulseAI.git

# Push to main branch
git branch -M main
git push -u origin main
```

## 3. Enable GitHub Codespaces

1. Go to your repository on GitHub
2. Click the green "Code" button
3. Select the "Codespaces" tab
4. Click "Create codespace on main"
5. Wait for the environment to initialize (~2-3 minutes)

The `.devcontainer/devcontainer.json` file will automatically:
- Install Python 3.11
- Install Node.js 18
- Install all dependencies
- Set up the database
- Configure port forwarding

## 4. Configure GitHub Actions Secrets (for Cloud Run deployment)

If you want to deploy to Cloud Run via GitHub Actions:

1. Go to repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add the following secrets:

   **GCP_PROJECT_ID**
   - Name: `GCP_PROJECT_ID`
   - Value: Your Google Cloud project ID

   **GCP_SA_KEY**
   - Name: `GCP_SA_KEY`
   - Value: Your service account JSON key (see below)

### Creating GCP Service Account Key

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployer"

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Copy the contents of key.json and paste as GCP_SA_KEY secret
```

## 5. Test GitHub Actions

1. Make a small change and push:
   ```bash
   git commit --allow-empty -m "Test CI workflow"
   git push
   ```

2. Go to repository → Actions tab
3. Watch the CI workflow run
4. Verify all checks pass

## 6. Deploy to Cloud Run (via GitHub Actions)

### Automatic Deployment (on push to main)

The workflow will automatically deploy when you push to the `main` branch.

### Manual Deployment

1. Go to repository → Actions tab
2. Select "Deploy to Cloud Run" workflow
3. Click "Run workflow"
4. Choose service to deploy (or "all" for all services)
5. Click "Run workflow"

## 7. Using GitHub Codespaces

### Start Development

1. Open your repository
2. Click "Code" → "Codespaces" → "Create codespace"
3. Wait for initialization
4. In the terminal, run:
   ```bash
   export MOCK=1
   npm run dev:all
   ```

### Access Services

- Ports are automatically forwarded
- Open the "Ports" tab in VS Code
- Click on port 5173 to open the dashboard
- Or use the popup notification

### Share Your Codespace

1. Click the "Ports" tab
2. Right-click on a port
3. Select "Port Visibility" → "Public"
4. Share the URL with others

## 8. Repository Structure

```
.github/
├── workflows/
│   ├── ci.yml              # Continuous Integration
│   └── deploy-cloudrun.yml # Cloud Run Deployment
.devcontainer/
├── devcontainer.json       # Codespaces configuration
└── post-create.sh          # Setup script
```

## 9. Workflow Files

### CI Workflow (`.github/workflows/ci.yml`)
- Runs on every push/PR
- Lints Python code
- Lints TypeScript code
- Tests service startup
- Builds Docker images

### Deploy Workflow (`.github/workflows/deploy-cloudrun.yml`)
- Runs on push to main or manual trigger
- Builds and pushes Docker images
- Deploys to Cloud Run
- Outputs service URLs

## 10. Best Practices

- ✅ Keep `.env` files out of git (already in `.gitignore`)
- ✅ Use GitHub Secrets for sensitive data
- ✅ Test in Codespaces before deploying
- ✅ Review Actions logs if deployment fails
- ✅ Use feature branches for development

## Troubleshooting

### Codespace won't start
- Check repository size (should be < 1GB)
- Verify `.devcontainer/devcontainer.json` is valid
- Check Actions tab for build errors

### GitHub Actions failing
- Verify secrets are set correctly
- Check GCP service account permissions
- Review workflow logs for specific errors

### Port forwarding not working
- Open "Ports" tab manually
- Check port visibility settings
- Verify services are running

## Next Steps

- ✅ Push code to GitHub
- ✅ Create Codespace
- ✅ Test locally in Codespace
- ✅ Configure secrets (optional)
- ✅ Deploy to Cloud Run (optional)

For more details, see:
- `README.md` - Full documentation
- `QUICKSTART.md` - Quick start guide
- `DEPLOYMENT.md` - Deployment instructions
- `.github/CODESPACES.md` - Codespaces guide

