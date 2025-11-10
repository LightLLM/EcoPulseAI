"""Gateway API service - Entry point for uploads, insights, and plans."""

import csv
import io
from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import sys
from pathlib import Path

# Add common to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from common.gcp import init_db, insert_energy, list_insights, list_plans, publish_event
from common.models import EnergyPoint, Insight, Plan

app = FastAPI(
    title="EcoPulse Gateway API",
    description="Entry point for energy data uploads, insights, and plans",
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
    return {"status": "healthy", "service": "gateway-api"}


@app.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    site: str = Query(default="plant-a", description="Site identifier")
):
    """
    Upload CSV file with energy data.
    
    Expected CSV format:
    timestamp,kw[,cost_usd,co2_kg,temp_c]
    """
    try:
        contents = await file.read()
        text = contents.decode("utf-8")
        reader = csv.DictReader(io.StringIO(text))
        
        rows_ingested = 0
        for row in reader:
            try:
                point = EnergyPoint(
                    timestamp=row["timestamp"],
                    kw=float(row["kw"]),
                    site=site,
                    cost_usd=float(row.get("cost_usd", 0)) if row.get("cost_usd") else None,
                    co2_kg=float(row.get("co2_kg", 0)) if row.get("co2_kg") else None,
                    temp_c=float(row.get("temp_c", 0)) if row.get("temp_c") else None,
                )
                insert_energy(point)
                rows_ingested += 1
            except (ValueError, KeyError) as e:
                # Skip invalid rows
                continue
        
        # Publish ingest event
        publish_event("event.ingest", {
            "site": site,
            "rows_ingested": rows_ingested,
            "filename": file.filename
        })
        
        return {
            "status": "success",
            "site": site,
            "rows_ingested": rows_ingested,
            "filename": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")


@app.get("/insights", response_model=List[Insight])
async def get_insights(site: str = Query(default="plant-a", description="Site identifier")):
    """Get recent insights for a site."""
    insights = list_insights(site, limit=10)
    return insights


@app.get("/plans", response_model=List[Plan])
async def get_plans(site: str = Query(default="plant-a", description="Site identifier")):
    """Get recent plans for a site."""
    plans = list_plans(site, limit=10)
    return plans

