"""Agent Planner - Generates actionable plans from insights."""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import sys
from pathlib import Path

# Add common to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from common.gcp import init_db, list_insights, save_plan
from common.models import Plan, PlanItem

app = FastAPI(
    title="EcoPulse Agent Planner",
    description="Generates actionable plans from insights",
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
    return {"status": "healthy", "service": "agent-planner"}


def generate_plan_items(insight) -> list[PlanItem]:
    """Generate actionable plan items based on insight."""
    items = []
    
    # If there are anomalies, add investigation items
    if insight.anomalies:
        high_anomalies = [a for a in insight.anomalies if a.severity == "high"]
        if high_anomalies:
            items.append(PlanItem(
                action="Investigate high-severity energy spikes",
                priority="high",
                expected_impact_kw=sum(a.deviation for a in high_anomalies) / len(high_anomalies),
                rationale=f"Detected {len(high_anomalies)} high-severity anomalies requiring immediate attention"
            ))
        
        items.append(PlanItem(
            action="Review anomaly patterns and root causes",
            priority="medium",
            expected_impact_kw=5.0,
            rationale=f"Total of {len(insight.anomalies)} anomalies detected across the dataset"
        ))
    
    # Always add standard optimization items
    items.append(PlanItem(
        action="Conduct nighttime load audit",
        priority="medium",
        expected_impact_kw=10.0,
        rationale="Nighttime loads may indicate unnecessary equipment running"
    ))
    
    items.append(PlanItem(
        action="HVAC system tune-up and optimization",
        priority="medium",
        expected_impact_kw=15.0,
        rationale="HVAC systems are typically the largest energy consumers"
    ))
    
    items.append(PlanItem(
        action="Review and optimize peak demand periods",
        priority="low",
        expected_impact_kw=8.0,
        rationale="Reducing peak demand can lower overall energy costs"
    ))
    
    # If forecast shows consistent load, suggest load balancing
    if insight.forecast_24h:
        avg_forecast = sum(f.kw for f in insight.forecast_24h) / len(insight.forecast_24h)
        items.append(PlanItem(
            action="Implement load balancing strategies",
            priority="low",
            expected_impact_kw=avg_forecast * 0.1,
            rationale=f"Forecasted average load of {avg_forecast:.1f} kW suggests opportunities for load shifting"
        ))
    
    return items


@app.post("/plan")
async def plan(site: str = Query(default="plant-a", description="Site identifier")):
    """
    Generate actionable plan from latest insight.
    """
    try:
        # Get latest insight
        insights = list_insights(site, limit=1)
        
        if not insights:
            return {
                "status": "no_insight",
                "site": site,
                "message": "No insights found. Run /analyze first."
            }
        
        latest_insight = insights[0]
        
        # Generate plan items
        items = generate_plan_items(latest_insight)
        
        # Create plan
        plan = Plan(
            site=site,
            created_at=datetime.utcnow().isoformat(),
            items=items,
            rationale=f"Generated {len(items)} actionable items based on latest insight (ID: {latest_insight.id})",
            insight_id=latest_insight.id
        )
        
        # Save plan
        plan_id = save_plan(plan)
        plan.id = plan_id
        
        return {
            "status": "success",
            "site": site,
            "plan_id": plan_id,
            "items_count": len(items),
            "plan": plan.dict()
        }
    except Exception as e:
        return {
            "status": "error",
            "site": site,
            "error": str(e)
        }

