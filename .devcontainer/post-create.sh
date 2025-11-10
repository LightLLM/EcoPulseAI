#!/bin/bash

# Post-create script for GitHub Codespaces
# This runs after the container is created

set -e

echo "🚀 Setting up EcoPulse.AI development environment..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r services/gateway-api/requirements.txt
pip install -r services/agent-harvester/requirements.txt
pip install -r services/agent-insight/requirements.txt
pip install -r services/agent-planner/requirements.txt
pip install -r services/agent-assistant/requirements.txt

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd web/dashboard
if command -v pnpm &> /dev/null; then
    pnpm install
else
    npm install
fi
cd ../..

# Install root dependencies (concurrently)
echo "📦 Installing root dependencies..."
npm install

# Set up environment
echo "⚙️ Setting up environment..."
if [ ! -f .env ]; then
    cp infra/sample.env .env
    echo "✅ Created .env file from sample"
fi

# Initialize database
echo "🗄️ Initializing database..."
export MOCK=1
python -c "from services.common.gcp import init_db; init_db(); print('Database initialized')"

# Make scripts executable
chmod +x infra/cloudrun-deploy.sh scripts/smoke.sh 2>/dev/null || true

echo "✅ Setup complete!"
echo ""
echo "To start all services, run:"
echo "  export MOCK=1 && npm run dev:all"
echo ""
echo "Or use the Makefile:"
echo "  make dev"
echo ""

