"""Agent Harvester - Triggers data collection and publishes insight events."""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path

# Add common to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from common.gcp import init_db, read_energy, publish_event

app = FastAPI(
    title="EcoPulse Agent Harvester",
    description="Triggers data collection and publishes insight events",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup():
    init_db()


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "agent-harvester"}


@app.post("/trigger")
async def trigger(site: str = Query(default="plant-a", description="Site identifier")):
    """
    Trigger data collection for a site.
    Reads energy data from database and publishes insight event.
    """
    try:
        # Read recent energy data
        energy_points = read_energy(site, limit=1000)
        row_count = len(energy_points)
        
        if row_count == 0:
            return {
                "status": "no_data",
                "site": site,
                "row_count": 0,
                "message": "No energy data found for site"
            }
        
        # Publish insight event
        publish_event("event.insight", {
            "site": site,
            "row_count": row_count,
            "latest_timestamp": energy_points[0].timestamp if energy_points else None
        })
        
        return {
            "status": "success",
            "site": site,
            "row_count": row_count,
            "message": f"Triggered insight analysis for {row_count} data points"
        }
    except Exception as e:
        return {
            "status": "error",
            "site": site,
            "error": str(e)
        }

