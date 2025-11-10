# GitHub Codespaces Setup

This repository is configured for GitHub Codespaces, providing a fully configured development environment in the cloud.

## Quick Start

1. **Create a Codespace**
   - Click the green "Code" button on GitHub
   - Select "Codespaces" tab
   - Click "Create codespace on main"
   - Wait for the environment to initialize (~2-3 minutes)

2. **Automatic Setup**
   - The post-create script will automatically:
     - Install Python dependencies
     - Install Node.js dependencies
     - Set up the environment file
     - Initialize the database

3. **Start Services**
   ```bash
   export MOCK=1
   npm run dev:all
   ```

4. **Access the Dashboard**
   - Ports are automatically forwarded
   - Click on the "Ports" tab in VS Code
   - Open the forwarded port 5173 (React Dashboard)
   - Or use the popup notification

## Port Forwarding

The following ports are automatically forwarded:

- **8080** - Gateway API (notify)
- **8081** - Harvester (silent)
- **8082** - Insight (silent)
- **8083** - Planner (silent)
- **8084** - Assistant (silent)
- **5173** - React Dashboard (notify)

## Features

- ✅ Pre-configured Python 3.11 environment
- ✅ Node.js 18+ installed
- ✅ Docker-in-Docker support
- ✅ VS Code extensions pre-installed
- ✅ Automatic dependency installation
- ✅ Database initialization

## Customization

Edit `.devcontainer/devcontainer.json` to customize:
- Python/Node versions
- VS Code extensions
- Port forwarding settings
- Post-create commands

## Troubleshooting

### Services won't start
- Check if ports are already in use
- Verify MOCK=1 is set
- Check logs in terminal

### Database errors
- Run: `python -c "from services.common.gcp import init_db; init_db()"`
- Check `.mock/` directory exists

### Port forwarding issues
- Open "Ports" tab in VS Code
- Manually forward ports if needed
- Check port visibility settings

## Next Steps

- Review `README.md` for full documentation
- Check `QUICKSTART.md` for detailed setup
- See `DEPLOYMENT.md` for Cloud Run deployment

