"""Agent Assistant - Q&A over insights and plans."""

from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path

# Add common to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from common.gcp import init_db, list_insights, list_plans
from common.models import AskRequest, AskResponse

app = FastAPI(
    title="EcoPulse Agent Assistant",
    description="Q&A over insights and plans",
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
    return {"status": "healthy", "service": "agent-assistant"}


def generate_answer(site: str, question: str, insights, plans) -> str:
    """Generate answer based on insights and plans."""
    question_lower = question.lower()
    
    # Simple keyword-based responses
    if "anomal" in question_lower or "spike" in question_lower or "outlier" in question_lower:
        if insights:
            latest = insights[0]
            anomaly_count = len(latest.anomalies)
            if anomaly_count > 0:
                high_count = sum(1 for a in latest.anomalies if a.severity == "high")
                return f"Found {anomaly_count} anomalies in the latest analysis, including {high_count} high-severity ones. Review the insights for details."
            else:
                return "No anomalies detected in the latest analysis. Energy consumption patterns appear normal."
        else:
            return "No insights available. Please run the analysis first."
    
    elif "forecast" in question_lower or "predict" in question_lower or "future" in question_lower:
        if insights:
            latest = insights[0]
            if latest.forecast_24h:
                avg_forecast = sum(f.kw for f in latest.forecast_24h) / len(latest.forecast_24h)
                return f"The 24-hour forecast predicts an average load of {avg_forecast:.1f} kW. Check the insights for detailed forecast data."
            else:
                return "No forecast data available in the latest insight."
        else:
            return "No insights available. Please run the analysis first."
    
    elif "plan" in question_lower or "action" in question_lower or "recommend" in question_lower:
        if plans:
            latest = plans[0]
            high_priority = [item for item in latest.items if item.priority == "high"]
            return f"The latest plan includes {len(latest.items)} actionable items, with {len(high_priority)} high-priority actions. Review the plans for details."
        else:
            return "No plans available. Please generate a plan first."
    
    elif "priority" in question_lower or "urgent" in question_lower:
        if plans:
            latest = plans[0]
            high_priority = [item for item in latest.items if item.priority == "high"]
            if high_priority:
                actions = ", ".join([item.action for item in high_priority[:3]])
                return f"High-priority actions: {actions}. Review the full plan for all recommendations."
            else:
                return "No high-priority actions in the current plan. All items are medium or low priority."
        else:
            return "No plans available. Please generate a plan first."
    
    else:
        # Generic response
        insight_count = len(insights)
        plan_count = len(plans)
        return f"For site '{site}': {insight_count} insights and {plan_count} plans available. Ask about anomalies, forecasts, or action plans for more specific information."


@app.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest = Body(...)):
    """
    Answer questions about insights and plans for a site.
    """
    try:
        # Get recent insights and plans
        insights = list_insights(request.site, limit=5)
        plans = list_plans(request.site, limit=5)
        
        # Generate answer
        answer = generate_answer(request.site, request.q, insights, plans)
        
        # Build sources
        sources = []
        if insights:
            sources.append(f"Latest insight (ID: {insights[0].id})")
        if plans:
            sources.append(f"Latest plan (ID: {plans[0].id})")
        
        return AskResponse(
            answer=answer,
            sources=sources
        )
    except Exception as e:
        return AskResponse(
            answer=f"Error processing question: {str(e)}",
            sources=[]
        )

