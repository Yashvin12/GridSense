"""
Initial schema — GridSense
Creates: users, feeder_nodes (PostGIS), feeder_edges, telemetry,
         meter_events, weather_events, consumer_complaints

Revision ID: 001
Revises:
Create Date: 2026-08-09
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry

# revision identifiers
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # PostGIS extension (idempotent — safe to run multiple times)
    # ------------------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # ------------------------------------------------------------------
    # Enums
    # ------------------------------------------------------------------
    user_role_enum   = sa.Enum("admin", "crew",                     name="userrole")
    node_type_enum   = sa.Enum("substation", "pole", "transformer",
                                "switch", "village",               name="nodetype")
    edge_type_enum   = sa.Enum("connected_to", "supplies",          name="edgetype")
    meter_event_enum = sa.Enum("heartbeat", "last_gasp",            name="metereventtype")

    # ------------------------------------------------------------------
    # users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id",            sa.Integer(),    primary_key=True, autoincrement=True),
        sa.Column("name",          sa.String(120),  nullable=False),
        sa.Column("email",         sa.String(255),  nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255),  nullable=False),
        sa.Column("role",          user_role_enum,  nullable=False, server_default="crew"),
        sa.Column("created_at",    sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )

    # ------------------------------------------------------------------
    # feeder_nodes  (PostGIS geometry column added separately)
    # ------------------------------------------------------------------
    op.create_table(
        "feeder_nodes",
        sa.Column("id",      sa.String(20),  primary_key=True),
        sa.Column("type",    node_type_enum, nullable=False),
        sa.Column("label",   sa.String(120), nullable=False),
        sa.Column("lat",     sa.Float(),     nullable=False),
        sa.Column("lng",     sa.Float(),     nullable=False),
        sa.Column("geom",    Geometry(geometry_type="POINT", srid=4326)),
        sa.Column("section", sa.String(20),  nullable=False),
        sa.Column("powered", sa.Boolean(),   nullable=False, server_default=sa.text("true")),
    )

    # ------------------------------------------------------------------
    # feeder_edges
    # ------------------------------------------------------------------
    op.create_table(
        "feeder_edges",
        sa.Column("id",        sa.Integer(),  primary_key=True, autoincrement=True),
        sa.Column("from_id",   sa.String(20), sa.ForeignKey("feeder_nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("to_id",     sa.String(20), sa.ForeignKey("feeder_nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("edge_type", edge_type_enum, nullable=False, server_default="connected_to"),
        sa.Column("section",   sa.String(20),  nullable=False),
    )

    # ------------------------------------------------------------------
    # telemetry
    # ------------------------------------------------------------------
    op.create_table(
        "telemetry",
        sa.Column("id",                 sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("timestamp",          sa.DateTime(timezone=True), nullable=False),
        sa.Column("node_id",            sa.String(20),
                  sa.ForeignKey("feeder_nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("current_a",          sa.Float()),
        sa.Column("voltage_v",          sa.Float()),
        sa.Column("transformer_temp_c", sa.Float()),
        sa.Column("is_fault_window",    sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index("ix_telemetry_timestamp", "telemetry", ["timestamp"])
    op.create_index("ix_telemetry_node_id",   "telemetry", ["node_id"])

    # ------------------------------------------------------------------
    # meter_events
    # ------------------------------------------------------------------
    op.create_table(
        "meter_events",
        sa.Column("id",           sa.Integer(),   primary_key=True, autoincrement=True),
        sa.Column("timestamp",    sa.DateTime(timezone=True), nullable=False),
        sa.Column("village_id",   sa.String(20),
                  sa.ForeignKey("feeder_nodes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("village_name", sa.String(120)),
        sa.Column("meter_count",  sa.Integer()),
        sa.Column("event_type",   meter_event_enum, nullable=False),
        sa.Column("node_id",      sa.String(20),
                  sa.ForeignKey("feeder_nodes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("section",      sa.String(20)),
    )

    # ------------------------------------------------------------------
    # weather_events
    # ------------------------------------------------------------------
    op.create_table(
        "weather_events",
        sa.Column("id",             sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("timestamp",      sa.DateTime(timezone=True), nullable=False),
        sa.Column("location",       sa.String(200)),
        sa.Column("wind_speed_kmh", sa.Float()),
        sa.Column("condition",      sa.String(100)),
    )

    # ------------------------------------------------------------------
    # consumer_complaints
    # ------------------------------------------------------------------
    op.create_table(
        "consumer_complaints",
        sa.Column("complaint_id", sa.String(20),  primary_key=True),
        sa.Column("timestamp",    sa.DateTime(timezone=True), nullable=False),
        sa.Column("village",      sa.String(120)),
        sa.Column("section",      sa.String(20)),
        sa.Column("description",  sa.Text()),
        sa.Column("source",       sa.String(80)),
    )


def downgrade() -> None:
    op.drop_table("consumer_complaints")
    op.drop_table("weather_events")
    op.drop_table("meter_events")
    op.drop_index("ix_telemetry_node_id",   "telemetry")
    op.drop_index("ix_telemetry_timestamp", "telemetry")
    op.drop_table("telemetry")
    op.drop_table("feeder_edges")
    op.drop_table("feeder_nodes")
    op.drop_table("users")

    for name in ("metereventtype", "edgetype", "nodetype", "userrole"):
        sa.Enum(name=name).drop(op.get_bind(), checkfirst=True)
