#!/usr/bin/env python3
"""
seed.py
=======
GridSense — database seed script

What it does
------------
1. Runs Alembic migrations (upgrade to head) so the schema is always
   current before seeding.
2. Loads all six CSV files from backend/data/ into the PostgreSQL tables.
3. Seeds two demo users with bcrypt-hashed passwords:
     admin@gridsense.io  /  AdminPass123  (role: admin)
     crew1@gridsense.io  /  CrewPass123   (role: crew)

Usage
-----
    # from backend/ with venv active:
    python seed.py

    # or point at a different DB:
    DATABASE_URL=postgresql://... python seed.py

Dependencies (add to requirements.txt if missing)
--------------------------------------------------
    bcrypt>=4.0
    alembic>=1.13
    geoalchemy2>=0.15
    sqlalchemy>=2.0
    psycopg2-binary>=2.9
    pandas>=2.2
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Make sure db/ is importable when running from backend/
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent          # backend/
sys.path.insert(0, str(BASE_DIR))

import pandas as pd
import bcrypt
from alembic.config import Config
from alembic import command
from sqlalchemy import text

from db.base import engine, SessionLocal
from db.models import (
    User, UserRole,
    FeederNode, NodeType,
    FeederEdge, EdgeType,
    Telemetry,
    MeterEvent, MeterEventType,
    WeatherEvent,
    ConsumerComplaint,
)

DATA_DIR = BASE_DIR / "data"


# ---------------------------------------------------------------------------
# 1. Run migrations
# ---------------------------------------------------------------------------

def run_migrations() -> None:
    print("▶  Running Alembic migrations …")
    alembic_cfg = Config(str(BASE_DIR / "alembic.ini"))
    # Override URL from environment if set
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(alembic_cfg, "head")
    print("✓  Migrations applied.")


# ---------------------------------------------------------------------------
# 2. Helper — hash a password
# ---------------------------------------------------------------------------

def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


# ---------------------------------------------------------------------------
# 3. Seed users
# ---------------------------------------------------------------------------

def seed_users(session) -> None:
    print("▶  Seeding users …")
    demo_users = [
        dict(
            name="Admin User",
            email="admin@gridsense.io",
            password_hash=_hash("AdminPass123"),
            role=UserRole.admin,
        ),
        dict(
            name="Crew Member 1",
            email="crew1@gridsense.io",
            password_hash=_hash("CrewPass123"),
            role=UserRole.crew,
        ),
    ]
    for u in demo_users:
        existing = session.query(User).filter_by(email=u["email"]).first()
        if existing:
            print(f"   skip (already exists): {u['email']}")
        else:
            session.add(User(**u))
            print(f"   created: {u['email']} ({u['role'].value})")
    session.commit()
    print("✓  Users seeded.")


# ---------------------------------------------------------------------------
# 4. Seed feeder_nodes
# ---------------------------------------------------------------------------

NODE_TYPE_MAP: dict[str, NodeType] = {
    "substation":  NodeType.substation,
    "pole":        NodeType.pole,
    "transformer": NodeType.transformer,
    "switch":      NodeType.switch,
    "village":     NodeType.village,
}


def seed_feeder_nodes(session) -> None:
    print("▶  Seeding feeder_nodes …")
    df = pd.read_csv(DATA_DIR / "feeder_topology.csv")
    df.dropna(subset=["id"], inplace=True)

    for _, row in df.iterrows():
        node_id = str(row["id"]).strip()
        if session.get(FeederNode, node_id):
            continue
        node = FeederNode(
            id      = node_id,
            type    = NODE_TYPE_MAP[str(row["type"]).strip()],
            label   = str(row["label"]).strip(),
            lat     = float(row["lat"]),
            lng     = float(row["lng"]),
            # ST_SetSRID(ST_MakePoint(lng, lat), 4326)
            geom    = f"SRID=4326;POINT({row['lng']} {row['lat']})",
            section = str(row["section"]).strip(),
            powered = str(row["powered"]).strip().lower() == "true",
        )
        session.add(node)

    session.commit()
    print(f"✓  feeder_nodes seeded ({len(df)} rows).")


# ---------------------------------------------------------------------------
# 5. Seed feeder_edges
# ---------------------------------------------------------------------------

EDGE_TYPE_MAP: dict[str, EdgeType] = {
    "connected_to": EdgeType.connected_to,
    "supplies":     EdgeType.supplies,
}


def seed_feeder_edges(session) -> None:
    print("▶  Seeding feeder_edges …")
    df = pd.read_csv(DATA_DIR / "feeder_edges.csv")
    df.dropna(subset=["from_id", "to_id"], inplace=True)

    # Clear existing to avoid duplicates on re-seed
    session.execute(text("DELETE FROM feeder_edges"))
    session.commit()

    for _, row in df.iterrows():
        edge = FeederEdge(
            from_id   = str(row["from_id"]).strip(),
            to_id     = str(row["to_id"]).strip(),
            edge_type = EDGE_TYPE_MAP.get(str(row["edge_type"]).strip(), EdgeType.connected_to),
            section   = str(row["section"]).strip(),
        )
        session.add(edge)

    session.commit()
    print(f"✓  feeder_edges seeded ({len(df)} rows).")


# ---------------------------------------------------------------------------
# 6. Seed telemetry
# ---------------------------------------------------------------------------

def seed_telemetry(session) -> None:
    print("▶  Seeding telemetry …")
    df = pd.read_csv(DATA_DIR / "telemetry_stream.csv")
    df.dropna(subset=["timestamp", "node_id"], inplace=True)

    session.execute(text("DELETE FROM telemetry"))
    session.commit()

    rows = []
    for _, row in df.iterrows():
        rows.append(Telemetry(
            timestamp          = pd.to_datetime(row["timestamp"], utc=True),
            node_id            = str(row["node_id"]).strip(),
            current_a          = float(row["current_A"]) if pd.notna(row.get("current_A")) else None,
            voltage_v          = float(row["voltage_V"]) if pd.notna(row.get("voltage_V")) else None,
            transformer_temp_c = float(row["transformer_temp_C"]) if pd.notna(row.get("transformer_temp_C")) else None,
            is_fault_window    = str(row["is_fault_window"]).strip().lower() == "true",
        ))
    session.bulk_save_objects(rows)
    session.commit()
    print(f"✓  telemetry seeded ({len(rows)} rows).")


# ---------------------------------------------------------------------------
# 7. Seed meter_events
# ---------------------------------------------------------------------------

METER_EVENT_MAP: dict[str, MeterEventType] = {
    "heartbeat": MeterEventType.heartbeat,
    "last_gasp": MeterEventType.last_gasp,
}


def seed_meter_events(session) -> None:
    print("▶  Seeding meter_events …")
    df = pd.read_csv(DATA_DIR / "meter_events.csv")
    df.dropna(subset=["timestamp"], inplace=True)

    session.execute(text("DELETE FROM meter_events"))
    session.commit()

    rows = []
    for _, row in df.iterrows():
        rows.append(MeterEvent(
            timestamp    = pd.to_datetime(row["timestamp"], utc=True),
            village_id   = str(row["village_id"]).strip() if pd.notna(row.get("village_id")) else None,
            village_name = str(row["village_name"]).strip() if pd.notna(row.get("village_name")) else None,
            meter_count  = int(row["meter_count"]) if pd.notna(row.get("meter_count")) else None,
            event_type   = METER_EVENT_MAP.get(str(row["event_type"]).strip(), MeterEventType.heartbeat),
            node_id      = str(row["node_id"]).strip() if pd.notna(row.get("node_id")) else None,
            section      = str(row["section"]).strip() if pd.notna(row.get("section")) else None,
        ))
    session.bulk_save_objects(rows)
    session.commit()
    print(f"✓  meter_events seeded ({len(rows)} rows).")


# ---------------------------------------------------------------------------
# 8. Seed weather_events
# ---------------------------------------------------------------------------

def seed_weather_events(session) -> None:
    print("▶  Seeding weather_events …")
    df = pd.read_csv(DATA_DIR / "weather_events.csv")
    df.dropna(subset=["timestamp"], inplace=True)

    session.execute(text("DELETE FROM weather_events"))
    session.commit()

    rows = []
    for _, row in df.iterrows():
        rows.append(WeatherEvent(
            timestamp      = pd.to_datetime(row["timestamp"], utc=True),
            location       = str(row["location"]).strip() if pd.notna(row.get("location")) else None,
            wind_speed_kmh = float(row["wind_speed_kmh"]) if pd.notna(row.get("wind_speed_kmh")) else None,
            condition      = str(row["condition"]).strip() if pd.notna(row.get("condition")) else None,
        ))
    session.bulk_save_objects(rows)
    session.commit()
    print(f"✓  weather_events seeded ({len(rows)} rows).")


# ---------------------------------------------------------------------------
# 9. Seed consumer_complaints
# ---------------------------------------------------------------------------

def seed_consumer_complaints(session) -> None:
    print("▶  Seeding consumer_complaints …")
    df = pd.read_csv(DATA_DIR / "consumer_complaints.csv")
    df.dropna(subset=["complaint_id", "timestamp"], inplace=True)

    for _, row in df.iterrows():
        cid = str(row["complaint_id"]).strip()
        if session.get(ConsumerComplaint, cid):
            continue
        session.add(ConsumerComplaint(
            complaint_id = cid,
            timestamp    = pd.to_datetime(row["timestamp"], utc=True),
            village      = str(row["village"]).strip() if pd.notna(row.get("village")) else None,
            section      = str(row["section"]).strip() if pd.notna(row.get("section")) else None,
            description  = str(row["description"]).strip() if pd.notna(row.get("description")) else None,
            source       = str(row["source"]).strip() if pd.notna(row.get("source")) else None,
        ))
    session.commit()
    print(f"✓  consumer_complaints seeded ({len(df)} rows).")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  GridSense DB Seed")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    run_migrations()

    with SessionLocal() as session:
        seed_users(session)
        seed_feeder_nodes(session)
        seed_feeder_edges(session)
        seed_telemetry(session)
        seed_meter_events(session)
        seed_weather_events(session)
        seed_consumer_complaints(session)

    print("\n✅  All done — GridSense DB is ready.\n")


if __name__ == "__main__":
    main()
