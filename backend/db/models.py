"""
db/models.py
============
SQLAlchemy ORM models for GridSense.

Tables
------
  users            — auth accounts (admin / crew)
  feeder_nodes     — substation, poles, transformers, switches, villages
  feeder_edges     — connections between nodes
  telemetry        — 30-second sensor readings per node
  meter_events     — smart-meter heartbeat / last_gasp events
  weather_events   — wind / condition readings
  consumer_complaints — field / helpline complaints
"""

from __future__ import annotations

import enum
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, func,
)

from .base import Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    admin = "admin"
    crew  = "crew"


class NodeType(str, enum.Enum):
    substation  = "substation"
    pole        = "pole"
    transformer = "transformer"
    switch      = "switch"
    village     = "village"


class EdgeType(str, enum.Enum):
    connected_to = "connected_to"
    supplies     = "supplies"


class MeterEventType(str, enum.Enum):
    heartbeat  = "heartbeat"
    last_gasp  = "last_gasp"


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True)
    name          = Column(String(120), nullable=False)
    email         = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(Enum(UserRole), nullable=False, default=UserRole.crew)
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ---------------------------------------------------------------------------
# Feeder topology
# ---------------------------------------------------------------------------

class FeederNode(Base):
    __tablename__ = "feeder_nodes"

    id      = Column(String(20), primary_key=True)   # e.g. "SS1", "P40", "V_A"
    type    = Column(Enum(NodeType), nullable=False)
    label   = Column(String(120), nullable=False)
    lat     = Column(Float, nullable=False)
    lng     = Column(Float, nullable=False)
    # PostGIS geometry (WGS-84, point)
    geom    = Column(Geometry(geometry_type="POINT", srid=4326))
    section = Column(String(20), nullable=False)     # "A", "B", "C", or "source"
    powered = Column(Boolean, nullable=False, default=True)


class FeederEdge(Base):
    __tablename__ = "feeder_edges"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    from_id   = Column(String(20), ForeignKey("feeder_nodes.id", ondelete="CASCADE"), nullable=False)
    to_id     = Column(String(20), ForeignKey("feeder_nodes.id", ondelete="CASCADE"), nullable=False)
    edge_type = Column(Enum(EdgeType), nullable=False, default=EdgeType.connected_to)
    section   = Column(String(20), nullable=False)


# ---------------------------------------------------------------------------
# Telemetry
# ---------------------------------------------------------------------------

class Telemetry(Base):
    __tablename__ = "telemetry"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    timestamp           = Column(DateTime(timezone=True), nullable=False)
    node_id             = Column(String(20), ForeignKey("feeder_nodes.id", ondelete="CASCADE"), nullable=False)
    current_a           = Column(Float)                    # Amperes
    voltage_v           = Column(Float)                    # Volts
    transformer_temp_c  = Column(Float)                    # °C (null for non-transformer nodes)
    is_fault_window     = Column(Boolean, nullable=False, default=False)


# ---------------------------------------------------------------------------
# Meter events
# ---------------------------------------------------------------------------

class MeterEvent(Base):
    __tablename__ = "meter_events"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    timestamp    = Column(DateTime(timezone=True), nullable=False)
    village_id   = Column(String(20), ForeignKey("feeder_nodes.id", ondelete="SET NULL"), nullable=True)
    village_name = Column(String(120))
    meter_count  = Column(Integer)
    event_type   = Column(Enum(MeterEventType), nullable=False)
    node_id      = Column(String(20), ForeignKey("feeder_nodes.id", ondelete="SET NULL"), nullable=True)
    section      = Column(String(20))


# ---------------------------------------------------------------------------
# Weather events
# ---------------------------------------------------------------------------

class WeatherEvent(Base):
    __tablename__ = "weather_events"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    timestamp      = Column(DateTime(timezone=True), nullable=False)
    location       = Column(String(200))
    wind_speed_kmh = Column(Float)
    condition      = Column(String(100))


# ---------------------------------------------------------------------------
# Consumer complaints
# ---------------------------------------------------------------------------

class ConsumerComplaint(Base):
    __tablename__ = "consumer_complaints"

    complaint_id = Column(String(20), primary_key=True)
    timestamp    = Column(DateTime(timezone=True), nullable=False)
    village      = Column(String(120))
    section      = Column(String(20))
    description  = Column(Text)
    source       = Column(String(80))
