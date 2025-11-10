# EcoPulse.AI Quick Start Guide

## Prerequisites

- Python 3.11+
- Node.js 18+ (pnpm recommended)
- Docker (optional, for containerized runs)
- Google Cloud SDK (for Cloud Run deployment)

## Local Development Setup

### 1. Python Environment

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Linux/Mac)
source .venv/bin/activate

# Install dependencies
pip install -r services/gateway-api/requirements.txt
pip install -r services/agent-harvester/requirements.txt
pip install -r services/agent-insight/requirements.txt
pip install -r services/agent-planner/requirements.txt
pip install -r services/agent-assistant/requirements.txt
```

### 2. Frontend Setup

```bash
cd web/dashboard
pnpm install  # or npm install / yarn install
cd ../..
```

### 3. Environment Configuration

```bash
# Copy sample env file
cp infra/sample.env .env

# Edit .env and set MOCK=1 for local development
```

### 4. Run Services

**Option A: Using npm scripts (requires concurrently)**

```bash
npm install  # Install concurrently
export MOCK=1  # Linux/Mac
set MOCK=1     # Windows
npm run dev:all
```

**Option B: Using Makefile**

```bash
make dev
```

**Option C: Manual (5 terminals)**

```bash
# Terminal 1: Gateway
export MOCK=1
cd services/gateway-api && uvicorn main:app --port 8080 --reload

# Terminal 2: Harvester
export MOCK=1
cd services/agent-harvester && uvicorn main:app --port 8081 --reload

# Terminal 3: Insight
export MOCK=1
cd services/agent-insight && uvicorn main:app --port 8082 --reload

# Terminal 4: Planner
export MOCK=1
cd services/agent-planner && uvicorn main:app --port 8083 --reload

# Terminal 5: Assistant
export MOCK=1
cd services/agent-assistant && uvicorn main:app --port 8084 --reload

# Terminal 6: Frontend
cd web/dashboard && pnpm dev
```

### 5. Access Dashboard

Open http://localhost:5173 in your browser.

## Quick Test Flow

1. **Generate & Upload CSV**
   - Set rows, base kW, variation, etc.
   - Click "Generate & Upload"
   - Verify status shows "Uploaded X rows successfully"

2. **Run Insight Analysis**
   - Click "Insight /analyze"
   - Optionally check "Use Gemini" for enhanced mode
   - Verify anomalies and forecast counts

3. **Generate Plan**
   - Click "Planner /plan"
   - Verify plan items appear

4. **View Results**
   - Click "Refresh" on Insights panel
   - Click "Refresh" on Plans panel
   - Verify data displays correctly

5. **Test Assistant**
   - Type a question (e.g., "How many anomalies?")
   - Click "Assistant /ask"
   - Verify response

## Smoke Tests

```bash
# Make sure all services are running first
chmod +x scripts/smoke.sh  # Linux/Mac only
./scripts/smoke.sh
```

## Docker Build (Local)

```bash
# Build all services
make build

# Or build individually
cd services
docker build -f gateway-api/Dockerfile -t ecopulse-gateway:latest .
docker build -f agent-harvester/Dockerfile -t ecopulse-harvester:latest .
# ... etc
```

## Cloud Run Deployment

### Prerequisites

```bash
# Authenticate
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Enable APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Deploy

```bash
# Set environment variables
export GCP_PROJECT_ID=your-project-id
export REGION=us-central1

# Run deployment script
./infra/cloudrun-deploy.sh
```

### Update Frontend URLs

After deployment, update `web/dashboard/src/App.tsx` with your Cloud Run URLs:

```typescript
const [gatewayUrl, setGatewayUrl] = useState('https://ecopulse-gateway-xxxxx.run.app')
// ... etc
```

## Troubleshooting

### Services won't start

- Check Python version: `python --version` (should be 3.11+)
- Verify virtual environment is activated
- Check port availability (8080-8084)

### Frontend won't build

- Verify Node.js version: `node --version` (should be 18+)
- Clear node_modules and reinstall: `rm -rf node_modules && pnpm install`

### Database errors

- Ensure `.mock/` directory exists (created automatically)
- Check file permissions
- Delete `.mock/ecopulse.db` to reset

### CORS errors

- Verify all services have CORS middleware enabled
- Check service URLs in frontend configuration

## Next Steps

- Review `README.md` for full documentation
- Check `scripts/smoke.sh` for automated testing
- Explore the codebase structure in `services/` and `web/`

