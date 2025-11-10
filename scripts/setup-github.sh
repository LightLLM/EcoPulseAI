#!/bin/bash

# GitHub Repository Setup Script
# This script helps set up the repository for GitHub

set -e

echo "🚀 EcoPulse.AI GitHub Setup"
echo "============================"
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git repository already initialized"
fi

# Check if remote exists
if git remote get-url origin &>/dev/null; then
    echo "✅ Remote 'origin' already configured"
    echo "   URL: $(git remote get-url origin)"
else
    echo ""
    echo "📝 Please provide your GitHub repository URL:"
    echo "   Example: https://github.com/username/EcoPulseAI.git"
    read -p "Repository URL: " REPO_URL
    
    if [ -n "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
        echo "✅ Remote 'origin' added: $REPO_URL"
    else
        echo "⚠️  No URL provided. You can add it later with:"
        echo "   git remote add origin <your-repo-url>"
    fi
fi

echo ""
echo "📋 Next steps:"
echo ""
echo "1. Add and commit all files:"
echo "   git add ."
echo "   git commit -m 'Initial commit: EcoPulse.AI full-stack application'"
echo ""
echo "2. Push to GitHub:"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Create a Codespace:"
echo "   - Go to your repository on GitHub"
echo "   - Click 'Code' → 'Codespaces' → 'Create codespace'"
echo ""
echo "4. (Optional) Set up GitHub Actions secrets for Cloud Run deployment:"
echo "   - Go to repository Settings → Secrets and variables → Actions"
echo "   - Add GCP_PROJECT_ID and GCP_SA_KEY"
echo "   - See GITHUB_SETUP.md for details"
echo ""
echo "📚 Documentation:"
echo "   - GITHUB_SETUP.md - Complete setup guide"
echo "   - .github/CODESPACES.md - Codespaces guide"
echo "   - README.md - Full documentation"
echo ""

