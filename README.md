# EcoPulse.AI — Cloud Run Hackathon

**Real-time Energy Intelligence Platform** — Detect anomalies, forecast load, and generate actionable plans for energy optimization.

## Problem Statement

Energy and emissions operations are **reactive and slow**. Traditional monitoring systems:
- Generate alerts only after problems occur
- Lack predictive capabilities
- Don't provide actionable recommendations
- Operate in silos without integrated workflows

**EcoPulse.AI** transforms energy data into real-time insights and automated action plans, enabling proactive optimization and cost reduction.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Dashboard (Vite)                    │
│              http://localhost:5173                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Gateway API (Cloud Run) :8080                   │
│         /upload | /insights | /plans                         │
└──────┬──────────────┬──────────────┬──────────────┬─────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Harvester │  │ Insight  │  │ Planner  │  │Assistant │
│  :8081   │  │  :8082   │  │  :8083   │  │  :8084   │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │             │
     └─────────────┴──────────────┴─────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Mock Pub/Sub +      │
         │  SQLite (MOCK=1)     │
         └──────────────────────┘
```

### Services

1. **Gateway API** (`:8080`) — Entry point for uploads, insights, and plans
2. **Agent Harvester** (`:8081`) — Triggers data collection
3. **Agent Insight** (`:8082`) — Anomaly detection + 24h forecast (Gemini toggle)
4. **Agent Planner** (`:8083`) — Generates actionable plans
5. **Agent Assistant** (`:8084`) — Q&A over insights/plans

## 🚀 Quick Start Options

### Option 1: GitHub Codespaces (Recommended)

The easiest way to get started is using GitHub Codespaces:

1. **Push to GitHub** (see `GITHUB_SETUP.md`)
2. **Create Codespace**:
   - Click "Code" → "Codespaces" → "Create codespace"
   - Wait ~2-3 minutes for setup
3. **Start Services**:
   ```bash
   export MOCK=1
   npm run dev:all
   ```
4. **Access Dashboard**: Ports are automatically forwarded

See `.github/CODESPACES.md` for detailed Codespaces guide.

### Option 2: Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+ (pnpm/npm/yarn)
- Docker (optional, for containerized runs)

### Setup

```bash
# 1. Create Python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Install backend dependencies
pip install -r services/gateway-api/requirements.txt
pip install -r services/agent-harvester/requirements.txt
pip install -r services/agent-insight/requirements.txt
pip install -r services/agent-planner/requirements.txt
pip install -r services/agent-assistant/requirements.txt

# 3. Install frontend dependencies
cd web/dashboard
pnpm install  # or npm install / yarn install
cd ../..
```

### Run Locally (MOCK=1)

```bash
# Set environment
export MOCK=1

# Terminal 1: Gateway
cd services/gateway-api && uvicorn main:app --port 8080 --reload

# Terminal 2: Harvester
cd services/agent-harvester && uvicorn main:app --port 8081 --reload

# Terminal 3: Insight
cd services/agent-insight && uvicorn main:app --port 8082 --reload

# Terminal 4: Planner
cd services/agent-planner && uvicorn main:app --port 8083 --reload

# Terminal 5: Assistant
cd services/agent-assistant && uvicorn main:app --port 8084 --reload

# Terminal 6: Frontend
cd web/dashboard && pnpm dev
```

**Or use the convenience script:**

```bash
# Install concurrently (if not already)
npm install -g concurrently

# Run all services
make dev  # or see scripts below
```

### Using npm/pnpm scripts

```bash
# From root
npm run dev:gateway
npm run dev:harvester
npm run dev:insight
npm run dev:planner
npm run dev:assistant
npm run dev:web

# Or all at once (requires concurrently)
npm run dev:all
```

## Deploy to Google Cloud Run

### Prerequisites

- Google Cloud SDK installed and authenticated
- Project ID set: `gcloud config set project YOUR_PROJECT_ID`
- APIs enabled: Cloud Run, Cloud Build, Artifact Registry

### Deploy All Services

```bash
# 1. Set environment variables
export GCP_PROJECT_ID=your-project-id
export REGION=us-central1

# 2. Run deployment script
chmod +x infra/cloudrun-deploy.sh
./infra/cloudrun-deploy.sh
```

### Manual Deployment (per service)

```bash
# Build and deploy Gateway
cd services/gateway-api
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/ecopulse-gateway:latest
gcloud run deploy ecopulse-gateway \
  --image gcr.io/$GCP_PROJECT_ID/ecopulse-gateway:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars MOCK=0,GCP_PROJECT_ID=$GCP_PROJECT_ID

# Repeat for other services (harvester, insight, planner, assistant)
```

### Update Frontend Service URLs

After deployment, update `web/dashboard/src/App.tsx` with your Cloud Run URLs:

```typescript
const GATEWAY_URL = 'https://ecopulse-gateway-xxxxx.run.app';
const HARVESTER_URL = 'https://ecopulse-harvester-xxxxx.run.app';
// ... etc
```

## Testing

### Smoke Test (Backend)

```bash
chmod +x scripts/smoke.sh
./scripts/smoke.sh
```

### Frontend Self-Test

1. Open dashboard: `http://localhost:5173`
2. Click **"Run Self-Test"** — verifies deterministic CSV generation
3. Generate & Upload CSV
4. Run **Insight /analyze** → check anomalies/forecast
5. Run **Planner /plan** → refresh plans → verify items
6. Toggle **Use Gemini** and run analyze again

### Unit Checks

```bash
cd web/dashboard
pnpm test  # if test script exists
```

## Judging Criteria Mapping

### 1. Technical Implementation (40%)

✅ **Microservices Architecture**
- 5 independent services (Gateway, Harvester, Insight, Planner, Assistant)
- Clean separation of concerns
- RESTful APIs with OpenAPI docs

✅ **Cloud Run Deployment**
- Dockerized services
- Auto-scaling, serverless
- Health endpoints (`/health`)

✅ **Data Pipeline**
- CSV ingestion → SQLite (mock) → Pub/Sub events
- Event-driven workflow
- Anomaly detection algorithm (mean ± 2σ)

✅ **Code Quality**
- TypeScript + Python type hints
- Clean, documented code
- Error handling

### 2. Demo & Presentation (30%)

✅ **3-Minute Demo Script** (see below)
✅ **Live Dashboard** with real-time updates
✅ **End-to-End Flow**: Upload → Analyze → Plan → Q&A

### 3. Innovation (30%)

✅ **Predictive Analytics**: 24h load forecast
✅ **Actionable Intelligence**: Automated plan generation
✅ **AI Integration**: Gemini toggle for enhanced analysis
✅ **Proactive Operations**: Anomaly detection before failures

## 3-Minute Demo Script

### 0:00-0:30 — Problem & Solution
> "Energy operations are reactive. EcoPulse.AI transforms data into real-time insights and automated action plans."

### 0:30-1:00 — Architecture
> "Five microservices on Cloud Run: Gateway, Harvester, Insight, Planner, Assistant. Event-driven with Pub/Sub."

### 1:00-2:00 — Live Demo
1. **Generate & Upload CSV** → "Ingested 100 rows"
2. **Run Insight /analyze** → "Detected 3 anomalies, forecasted 24h load"
3. **Run Planner /plan** → "Generated 5 actionable items"
4. **Toggle Gemini** → "Enhanced analysis with AI"
5. **Ask Assistant** → "What should I prioritize?"

### 2:00-2:30 — Results
> "Proactive anomaly detection, 24h forecasting, automated recommendations. Deployed on Cloud Run with auto-scaling."

### 2:30-3:00 — Q&A
> "Questions?"

## Optional Points

- ✅ **Gemini Integration**: Toggleable AI mode
- ✅ **Multi-Service Architecture**: 5 services
- ✅ **Blog Post**: [Link to blog]
- ✅ **Social**: #CloudRunHackathon #EcoPulseAI

## Project Structure

```
ecopulse/
├── README.md
├── .gitignore
├── Makefile
├── package.json
├── infra/
│   ├── cloudrun-deploy.sh
│   └── sample.env
├── services/
│   ├── gateway-api/
│   ├── agent-harvester/
│   ├── agent-insight/
│   ├── agent-planner/
│   ├── agent-assistant/
│   └── common/
│       ├── __init__.py
│       ├── gcp.py
│       └── models.py
├── web/
│   └── dashboard/
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           └── components/
│               └── EcoPulseDashboard.tsx
└── scripts/
    └── smoke.sh
```

## License

MIT

## Team

Built for Google Cloud Run Hackathon 2025

