.PHONY: dev build deploy clean install

# Development
dev:
	@echo "Starting all services in development mode..."
	@export MOCK=1 && npm run dev:all

dev-gateway:
	@export MOCK=1 && npm run dev:gateway

dev-harvester:
	@export MOCK=1 && npm run dev:harvester

dev-insight:
	@export MOCK=1 && npm run dev:insight

dev-planner:
	@export MOCK=1 && npm run dev:planner

dev-assistant:
	@export MOCK=1 && npm run dev:assistant

dev-web:
	@npm run dev:web

# Build
build:
	@echo "Building Docker images..."
	@docker build -t ecopulse-gateway:latest -f services/gateway-api/Dockerfile services/
	@docker build -t ecopulse-harvester:latest -f services/agent-harvester/Dockerfile services/
	@docker build -t ecopulse-insight:latest -f services/agent-insight/Dockerfile services/
	@docker build -t ecopulse-planner:latest -f services/agent-planner/Dockerfile services/
	@docker build -t ecopulse-assistant:latest -f services/agent-assistant/Dockerfile services/

# Deploy
deploy:
	@chmod +x infra/cloudrun-deploy.sh
	@./infra/cloudrun-deploy.sh

# Install dependencies
install:
	@echo "Installing Python dependencies..."
	@pip install -r services/gateway-api/requirements.txt
	@pip install -r services/agent-harvester/requirements.txt
	@pip install -r services/agent-insight/requirements.txt
	@pip install -r services/agent-planner/requirements.txt
	@pip install -r services/agent-assistant/requirements.txt
	@echo "Installing Node dependencies..."
	@cd web/dashboard && pnpm install

# Clean
clean:
	@echo "Cleaning up..."
	@rm -rf .mock/
	@rm -rf web/dashboard/node_modules/
	@rm -rf web/dashboard/dist/
	@find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete

# Test
test:
	@echo "Running smoke tests..."
	@chmod +x scripts/smoke.sh
	@./scripts/smoke.sh

