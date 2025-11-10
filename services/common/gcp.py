"""Mock GCP services for local development (MOCK=1)."""

import os
import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from .models import EnergyPoint, Insight, Plan, Anomaly, ForecastPoint, PlanItem


MOCK = os.getenv("MOCK", "0") == "1"
DB_PATH = Path(".mock/ecopulse.db")
DB_PATH.parent.mkdir(exist_ok=True)


# ============================================================================
# SQLite Database Helpers
# ============================================================================

def init_db():
    """Initialize SQLite database with required tables."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # Energy points table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS energy_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            kw REAL NOT NULL,
            site TEXT NOT NULL,
            cost_usd REAL,
            co2_kg REAL,
            temp_c REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Insights table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            summary TEXT,
            mode TEXT,
            data_json TEXT
        )
    """)
    
    # Plans table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            rationale TEXT,
            insight_id INTEGER,
            data_json TEXT
        )
    """)
    
    conn.commit()
    conn.close()


def insert_energy(point: EnergyPoint) -> int:
    """Insert energy point into database. Returns row ID."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO energy_points (timestamp, kw, site, cost_usd, co2_kg, temp_c)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (point.timestamp, point.kw, point.site, point.cost_usd, point.co2_kg, point.temp_c))
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id


def read_energy(site: str, limit: int = 1000) -> List[EnergyPoint]:
    """Read energy points for a site, most recent first."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT timestamp, kw, site, cost_usd, co2_kg, temp_c
        FROM energy_points
        WHERE site = ?
        ORDER BY timestamp DESC
        LIMIT ?
    """, (site, limit))
    rows = cursor.fetchall()
    conn.close()
    
    return [
        EnergyPoint(
            timestamp=row["timestamp"],
            kw=row["kw"],
            site=row["site"],
            cost_usd=row["cost_usd"],
            co2_kg=row["co2_kg"],
            temp_c=row["temp_c"]
        )
        for row in rows
    ]


def save_insight(insight: Insight) -> int:
    """Save insight to database. Returns insight ID."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    data_json = json.dumps({
        "anomalies": [a.dict() for a in insight.anomalies],
        "forecast_24h": [f.dict() for f in insight.forecast_24h]
    })
    cursor.execute("""
        INSERT INTO insights (site, created_at, summary, mode, data_json)
        VALUES (?, ?, ?, ?, ?)
    """, (insight.site, insight.created_at, insight.summary, insight.mode, data_json))
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id


def list_insights(site: str, limit: int = 10) -> List[Insight]:
    """List recent insights for a site."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, site, created_at, summary, mode, data_json
        FROM insights
        WHERE site = ?
        ORDER BY created_at DESC
        LIMIT ?
    """, (site, limit))
    rows = cursor.fetchall()
    conn.close()
    
    insights = []
    for row in rows:
        data = json.loads(row["data_json"] or "{}")
        insight = Insight(
            id=row["id"],
            site=row["site"],
            created_at=row["created_at"],
            summary=row["summary"],
            mode=row["mode"],
            anomalies=[Anomaly(**a) for a in data.get("anomalies", [])],
            forecast_24h=[ForecastPoint(**f) for f in data.get("forecast_24h", [])]
        )
        insights.append(insight)
    
    return insights


def save_plan(plan: Plan) -> int:
    """Save plan to database. Returns plan ID."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    data_json = json.dumps({
        "items": [item.dict() for item in plan.items]
    })
    cursor.execute("""
        INSERT INTO plans (site, created_at, rationale, insight_id, data_json)
        VALUES (?, ?, ?, ?, ?)
    """, (plan.site, plan.created_at, plan.rationale, plan.insight_id, data_json))
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id


def list_plans(site: str, limit: int = 10) -> List[Plan]:
    """List recent plans for a site."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, site, created_at, rationale, insight_id, data_json
        FROM plans
        WHERE site = ?
        ORDER BY created_at DESC
        LIMIT ?
    """, (site, limit))
    rows = cursor.fetchall()
    conn.close()
    
    plans = []
    for row in rows:
        data = json.loads(row["data_json"] or "{}")
        plan = Plan(
            id=row["id"],
            site=row["site"],
            created_at=row["created_at"],
            rationale=row["rationale"],
            insight_id=row["insight_id"],
            items=[PlanItem(**item) for item in data.get("items", [])]
        )
        plans.append(plan)
    
    return plans


# ============================================================================
# Mock Pub/Sub Publisher
# ============================================================================

class MockPubSubPublisher:
    """Mock Pub/Sub publisher for local development."""
    
    def __init__(self):
        self.published: List[Dict[str, Any]] = []
    
    def publish(self, topic: str, data: Dict[str, Any]):
        """Publish message to topic (mock)."""
        message = {
            "topic": topic,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.published.append(message)
        print(f"[MOCK Pub/Sub] Published to {topic}: {json.dumps(data)[:100]}...")


# Global mock publisher instance
_publisher = MockPubSubPublisher()


def get_publisher() -> MockPubSubPublisher:
    """Get the mock Pub/Sub publisher."""
    return _publisher


def publish_event(topic: str, data: Dict[str, Any]):
    """Publish event to topic."""
    if MOCK:
        get_publisher().publish(topic, data)
    else:
        # TODO: Real GCP Pub/Sub integration
        # from google.cloud import pubsub_v1
        # publisher = pubsub_v1.PublisherClient()
        # topic_path = publisher.topic_path(project_id, topic)
        # publisher.publish(topic_path, json.dumps(data).encode())
        pass

