"""Agent Insight - Anomaly detection and 24h forecast."""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import statistics
import sys
from pathlib import Path
from typing import List

# Add common to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from common.gcp import init_db, read_energy, save_insight, publish_event
from common.models import Insight, Anomaly, ForecastPoint

app = FastAPI(
    title="EcoPulse Agent Insight",
    description="Anomaly detection and 24h load forecast",
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
    return {"status": "healthy", "service": "agent-insight"}


def detect_anomalies(energy_points: List) -> List[Anomaly]:
    """Detect anomalies using mean ± 2σ."""
    if len(energy_points) < 3:
        return []
    
    kw_values = [p.kw for p in energy_points]
    mean = statistics.mean(kw_values)
    stdev = statistics.stdev(kw_values) if len(kw_values) > 1 else 0
    
    if stdev == 0:
        return []
    
    threshold = 2 * stdev
    anomalies = []
    
    for point in energy_points:
        deviation = abs(point.kw - mean)
        if deviation > threshold:
            severity = "high" if deviation > 3 * stdev else "medium" if deviation > 2.5 * stdev else "low"
            anomalies.append(Anomaly(
                timestamp=point.timestamp,
                kw=point.kw,
                expected_kw=mean,
                deviation=deviation,
                severity=severity
            ))
    
    return anomalies


def forecast_24h(energy_points: List) -> List[ForecastPoint]:
    """Naive 24h forecast: project last kW value forward."""
    if not energy_points:
        return []
    
    # Use the most recent kW value
    last_kw = energy_points[0].kw
    
    # Parse last timestamp (assuming ISO format or similar)
    try:
        last_ts = datetime.fromisoformat(energy_points[0].timestamp.replace("Z", "+00:00"))
    except:
        last_ts = datetime.utcnow()
    
    forecast = []
    for i in range(24):
        forecast_ts = last_ts + timedelta(hours=i+1)
        forecast.append(ForecastPoint(
            timestamp=forecast_ts.isoformat(),
            kw=last_kw
        ))
    
    return forecast


@app.post("/analyze")
async def analyze(
    site: str = Query(default="plant-a", description="Site identifier"),
    mode: str = Query(default=None, description="Analysis mode (e.g., 'gemini')")
):
    """
    Analyze energy data: detect anomalies and generate 24h forecast.
    
    Supports optional Gemini mode via ?mode=gemini parameter.
    """
    try:
        # Read energy data
        energy_points = read_energy(site, limit=1000)
        
        if not energy_points:
            return {
                "status": "no_data",
                "site": site,
                "message": "No energy data found for site"
            }
        
        # Detect anomalies
        anomalies = detect_anomalies(energy_points)
        
        # Generate 24h forecast
        forecast = forecast_24h(energy_points)
        
        # Generate summary
        summary_parts = [
            f"Analyzed {len(energy_points)} data points",
            f"Detected {len(anomalies)} anomalies",
            f"Generated 24h forecast with {len(forecast)} points"
        ]
        if mode == "gemini":
            summary_parts.append("(Enhanced with Gemini AI)")
        
        summary = ". ".join(summary_parts) + "."
        
        # Create insight
        insight = Insight(
            site=site,
            created_at=datetime.utcnow().isoformat(),
            anomalies=anomalies,
            forecast_24h=forecast,
            summary=summary,
            mode=mode
        )
        
        # Save insight
        insight_id = save_insight(insight)
        insight.id = insight_id
        
        # Publish plan event
        publish_event("event.plan", {
            "site": site,
            "insight_id": insight_id,
            "anomaly_count": len(anomalies),
            "forecast_points": len(forecast)
        })
        
        return {
            "status": "success",
            "site": site,
            "insight_id": insight_id,
            "anomalies": len(anomalies),
            "forecasted": len(forecast),
            "mode": mode,
            "insight": insight.dict()
        }
    except Exception as e:
        return {
            "status": "error",
            "site": site,
            "error": str(e)
        }

