"""Pydantic models for EcoPulse services."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class EnergyPoint(BaseModel):
    """Energy data point."""
    timestamp: str
    kw: float
    site: str
    cost_usd: Optional[float] = None
    co2_kg: Optional[float] = None
    temp_c: Optional[float] = None


class Anomaly(BaseModel):
    """Detected anomaly."""
    timestamp: str
    kw: float
    expected_kw: float
    deviation: float
    severity: str  # "low", "medium", "high"


class ForecastPoint(BaseModel):
    """Forecast data point."""
    timestamp: str
    kw: float


class Insight(BaseModel):
    """Insight result."""
    id: Optional[int] = None
    site: str
    created_at: str
    anomalies: List[Anomaly] = Field(default_factory=list)
    forecast_24h: List[ForecastPoint] = Field(default_factory=list)
    summary: str
    mode: Optional[str] = None  # "gemini" or None


class PlanItem(BaseModel):
    """Actionable plan item."""
    action: str
    priority: str  # "low", "medium", "high"
    expected_impact_kw: float
    rationale: str


class Plan(BaseModel):
    """Action plan."""
    id: Optional[int] = None
    site: str
    created_at: str
    items: List[PlanItem] = Field(default_factory=list)
    rationale: str
    insight_id: Optional[int] = None


class AskRequest(BaseModel):
    """Assistant query request."""
    site: str
    q: str


class AskResponse(BaseModel):
    """Assistant query response."""
    answer: str
    sources: List[str] = Field(default_factory=list)

