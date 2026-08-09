"""
generate_synthetic_data.py
===========================
GridSense — Synthetic Dataset Generator
Mulshi 33kV Feeder, Pune district, Maharashtra
Scenario date: 2026-08-08, fault onset at 14:22:00 IST

Generates 4 CSV files into backend/data/:
  1. telemetry_stream.csv   — 60 readings (30s apart) from 13:52 to 14:22
  2. meter_events.csv       — smart-meter last-gasp events per village
  3. weather_events.csv     — wind speed time series with fault-window spike
  4. consumer_complaints.csv — outage complaint records from Kolvan

Run:
    cd backend
    python generate_synthetic_data.py
"""

import csv
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Seed for reproducibility ─────────────────────────────────────────────────
random.seed(42)

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── Scenario anchor ───────────────────────────────────────────────────────────
IST = timezone(timedelta(hours=5, minutes=30))
FAULT_ONSET = datetime(2026, 8, 8, 14, 22, 0, tzinfo=IST)
SCENARIO_DATE = "2026-08-08"


def fmt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S+05:30")


# =============================================================================
# 1. telemetry_stream.csv
#    60 readings, 30s apart, starting 30 min before fault (13:52:00)
#    Columns: timestamp, node_id, current_A, voltage_V, transformer_temp_C
#    node_id: SS1 (substation) for location evidence
# =============================================================================
def generate_telemetry():
    out = DATA_DIR / "telemetry_stream.csv"
    start = FAULT_ONSET - timedelta(minutes=30)   # 13:52:00

    rows = []
    for i in range(60):
        ts = start + timedelta(seconds=i * 30)
        is_fault = i >= 40    # fault kicks in at reading 40 (14:12 → aligned scenario)

        if is_fault:
            current  = round(random.uniform(1.8, 3.2), 2)    # abnormally low
            voltage  = round(random.uniform(172, 205), 1)     # sag
            temp     = round(random.uniform(75, 94), 1)       # overheating
        else:
            current  = round(random.uniform(42, 57), 2)       # normal load
            voltage  = round(random.uniform(228, 235), 1)     # normal
            temp     = round(random.uniform(50, 62), 1)       # normal

        rows.append({
            "timestamp":          fmt(ts),
            "node_id":            "SS1",
            "current_A":          current,
            "voltage_V":          voltage,
            "transformer_temp_C": temp,
            "is_fault_window":    "true" if is_fault else "false",
        })

    fieldnames = ["timestamp", "node_id", "current_A", "voltage_V",
                  "transformer_temp_C", "is_fault_window"]
    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"[OK] {out.name} — {len(rows)} rows")


# =============================================================================
# 2. meter_events.csv
#    Smart-meter "last-gasp" (power-loss interrupt) events per village
#    Columns: timestamp, village_id, village_name, meter_count, event_type
# =============================================================================
def generate_meter_events():
    out = DATA_DIR / "meter_events.csv"

    events = [
        # Kolvan (Section B) — first last-gasp, 18s after fault
        {
            "timestamp":    fmt(FAULT_ONSET + timedelta(seconds=18)),
            "village_id":   "V_B",
            "village_name": "Kolvan",
            "meter_count":  14,
            "event_type":   "last_gasp",
            "node_id":      "T2",
            "section":      "B",
        },
        # Bhira (Section C) — slightly later, downstream propagation
        {
            "timestamp":    fmt(FAULT_ONSET + timedelta(seconds=20)),
            "village_id":   "V_C",
            "village_name": "Bhira",
            "meter_count":  8,
            "event_type":   "last_gasp",
            "node_id":      "T3",
            "section":      "C",
        },
        # Tamhini (Section A) — no last-gasp, stays powered; heartbeat only
        {
            "timestamp":    fmt(FAULT_ONSET + timedelta(minutes=2)),
            "village_id":   "V_A",
            "village_name": "Tamhini",
            "meter_count":  11,
            "event_type":   "heartbeat",    # normal — NOT a last-gasp
            "node_id":      "T1",
            "section":      "A",
        },
    ]

    fieldnames = ["timestamp", "village_id", "village_name", "meter_count",
                  "event_type", "node_id", "section"]
    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(events)

    print(f"[OK] {out.name} — {len(events)} rows")


# =============================================================================
# 3. weather_events.csv
#    Wind speed readings every 10 minutes from 13:00 to 15:00
#    Spike during 14:20–14:30 fault window (47+ km/h gusts)
#    Columns: timestamp, location, wind_speed_kmh, condition
# =============================================================================
def generate_weather():
    out = DATA_DIR / "weather_events.csv"

    window_start = datetime(2026, 8, 8, 13,  0, 0, tzinfo=IST)
    window_end   = datetime(2026, 8, 8, 15, 10, 0, tzinfo=IST)
    interval     = timedelta(minutes=10)

    rows = []
    ts = window_start
    while ts <= window_end:
        # Fault window: 14:15 → 14:35 — high wind
        is_storm = datetime(2026, 8, 8, 14, 15, tzinfo=IST) <= ts <= datetime(2026, 8, 8, 14, 35, tzinfo=IST)

        if is_storm:
            wind_speed = round(random.uniform(42, 54), 1)
            condition  = "High Wind / Gusts"
        else:
            wind_speed = round(random.uniform(8, 22), 1)
            condition  = "Normal"

        rows.append({
            "timestamp":      fmt(ts),
            "location":       "Mulshi (18.5020, 73.4830)",   # Pole 43-46 corridor
            "wind_speed_kmh": wind_speed,
            "condition":      condition,
        })
        ts += interval

    fieldnames = ["timestamp", "location", "wind_speed_kmh", "condition"]
    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"[OK] {out.name} — {len(rows)} rows")


# =============================================================================
# 4. consumer_complaints.csv
#    3 outage complaints from Kolvan area arriving 2-5 min after fault
#    Columns: timestamp, complaint_id, village, description, source
# =============================================================================
def generate_complaints():
    out = DATA_DIR / "consumer_complaints.csv"

    complaints = [
        {
            "complaint_id":  "CMP-001",
            "timestamp":     fmt(FAULT_ONSET + timedelta(minutes=2, seconds=12)),
            "village":       "Kolvan",
            "section":       "B",
            "description":   "Complete power outage since approximately 2:22 PM. All lights off.",
            "source":        "mobile_app",
        },
        {
            "complaint_id":  "CMP-002",
            "timestamp":     fmt(FAULT_ONSET + timedelta(minutes=3, seconds=45)),
            "village":       "Kolvan",
            "section":       "B",
            "description":   "No electricity in entire colony. Water pump also stopped working.",
            "source":        "helpline_1912",
        },
        {
            "complaint_id":  "CMP-003",
            "timestamp":     fmt(FAULT_ONSET + timedelta(minutes=4, seconds=58)),
            "village":       "Kolvan",
            "section":       "B",
            "description":   "Loud bang heard near the transformer around 2:22 PM, then power cut.",
            "source":        "mobile_app",
        },
    ]

    fieldnames = ["complaint_id", "timestamp", "village", "section",
                  "description", "source"]
    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(complaints)

    print(f"[OK] {out.name} — {len(complaints)} rows")


# =============================================================================
# Run all generators
# =============================================================================
if __name__ == "__main__":
    print("Generating GridSense synthetic datasets...\n")
    generate_telemetry()
    generate_meter_events()
    generate_weather()
    generate_complaints()
    print(f"\nAll files written to: {DATA_DIR.resolve()}")
