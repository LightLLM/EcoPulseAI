# Deployment Guide

## Local Development

### Start All Services

```bash
# 1. Setup Python environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# 2. Install Python dependencies
pip install -r services/gateway-api/requirements.txt
pip install -r services/agent-harvester/requirements.txt
pip install -r services/agent-insight/requirements.txt
pip install -r services/agent-planner/requirements.txt
pip install -r services/agent-assistant/requirements.txt

# 3. Install frontend dependencies
cd web/dashboard
pnpm install  # or npm install
cd ../..

# 4. Set environment
export MOCK=1  # Linux/Mac
set MOCK=1     # Windows

# 5. Start all services
npm install  # Install concurrently if needed
npm run dev:all
```

### Individual Service Commands

```bash
# Gateway (port 8080)
cd services/gateway-api && uvicorn main:app --port 8080 --reload

# Harvester (port 8081)
cd services/agent-harvester && uvicorn main:app --port 8081 --reload

# Insight (port 8082)
cd services/agent-insight && uvicorn main:app --port 8082 --reload

# Planner (port 8083)
cd services/agent-planner && uvicorn main:app --port 8083 --reload

# Assistant (port 8084)
cd services/agent-assistant && uvicorn main:app --port 8084 --reload

# Frontend (port 5173)
cd web/dashboard && pnpm dev
```

## Cloud Run Deployment

### Prerequisites

```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Deploy All Services

```bash
# 1. Set environment variables
export GCP_PROJECT_ID=your-project-id
export REGION=us-central1

# 2. Make script executable (Linux/Mac)
chmod +x infra/cloudrun-deploy.sh

# 3. Run deployment
./infra/cloudrun-deploy.sh
```

### Manual Deployment (per service)

```bash
# Set variables
export GCP_PROJECT_ID=your-project-id
export REGION=us-central1
export SERVICE=gateway-api
export PORT=8080

# Build image
cd services
docker build -f $SERVICE/Dockerfile -t gcr.io/$GCP_PROJECT_ID/ecopulse-$SERVICE:latest .

# Push to GCR
docker push gcr.io/$GCP_PROJECT_ID/ecopulse-$SERVICE:latest

# Deploy to Cloud Run
gcloud run deploy ecopulse-$SERVICE \
  --image gcr.io/$GCP_PROJECT_ID/ecopulse-$SERVICE:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port $PORT \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "MOCK=0,GCP_PROJECT_ID=$GCP_PROJECT_ID,REGION=$REGION"
```

### Get Service URLs

```bash
# List all services
gcloud run services list --platform managed --region $REGION

# Get specific service URL
gcloud run services describe ecopulse-gateway-api \
  --platform managed \
  --region $REGION \
  --format 'value(status.url)'
```

### Update Frontend Configuration

After deployment, update `web/dashboard/src/App.tsx`:

```typescript
const [gatewayUrl, setGatewayUrl] = useState('https://ecopulse-gateway-xxxxx.run.app')
const [harvesterUrl, setHarvesterUrl] = useState('https://ecopulse-harvester-xxxxx.run.app')
const [insightUrl, setInsightUrl] = useState('https://ecopulse-insight-xxxxx.run.app')
const [plannerUrl, setPlannerUrl] = useState('https://ecopulse-planner-xxxxx.run.app')
const [assistantUrl, setAssistantUrl] = useState('https://ecopulse-assistant-xxxxx.run.app')
```

## Testing

### Smoke Tests

```bash
# Make sure all services are running
chmod +x scripts/smoke.sh  # Linux/Mac only
./scripts/smoke.sh
```

### Frontend Self-Test

1. Open dashboard: http://localhost:5173
2. Click "Run Self-Test" button
3. Verify all tests pass

### Manual E2E Test

1. Generate & Upload CSV
2. Run Harvester /trigger
3. Run Insight /analyze (with/without Gemini)
4. Run Planner /plan
5. Refresh Insights & Plans
6. Ask Assistant a question

## Environment Variables

### Local Development (.env)

```bash
MOCK=1
GCP_PROJECT_ID=your-project-id
REGION=us-central1
```

### Cloud Run

Set via `--set-env-vars` flag:

```bash
MOCK=0
GCP_PROJECT_ID=your-project-id
REGION=us-central1
TOPIC_INGEST=event.ingest
TOPIC_INSIGHT=event.insight
TOPIC_PLAN=event.plan
```

## Troubleshooting

### Build Failures

- Verify Docker is running
- Check Dockerfile paths are correct
- Ensure build context includes `common/` directory

### Deployment Failures

- Verify GCP project ID is correct
- Check API permissions
- Ensure billing is enabled
- Review Cloud Build logs

### Runtime Errors

- Check Cloud Run logs: `gcloud run services logs read ecopulse-gateway-api`
- Verify environment variables are set
- Check service health endpoints

