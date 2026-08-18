#!/usr/bin/env python3
"""
prepare_data.py -- pulls real Week 1-4 output files from the naip/ project
into this dashboard's public/data/, with one aggregation step (a per-district
hazard summary for the choropleth map -- the raw 16,128-row district_alerts
file is copied through too, unaggregated, for the detail table).

Nothing here fabricates or pads data. If a source file is missing, this
script stops and says so rather than writing a placeholder.
"""
import csv
import json
import os
import shutil
from collections import defaultdict

NAIP = r"C:\Users\USER\Desktop\NASTP\Project\naip"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "data")
os.makedirs(OUT, exist_ok=True)

SOURCES = {
    "district_alerts.json": os.path.join(NAIP, "backend", "alerts", "district_alerts.json"),
    "water_stress.json": os.path.join(NAIP, "models", "water_stress", "water_stress.json"),
    "crop_classifier_report.json": os.path.join(NAIP, "models", "crop_classifier", "report.json"),
    "locust_risk.json": os.path.join(NAIP, "models", "locust_risk", "locust_risk.json"),
    "exposure_risk.json": os.path.join(NAIP, "models", "fusion", "exposure_risk.json"),
    "pk_districts.geojson": os.path.join(NAIP, "data", "seed", "pk_districts.geojson"),
    "trigger_summary_national.json": os.path.join(NAIP, "backend", "insurance_engine", "trigger_summary.json"),
    "trigger_summary_demo.json": os.path.join(NAIP, "backend", "insurance_engine", "trigger_summary_demo.json"),
}

missing = [(name, path) for name, path in SOURCES.items() if not os.path.exists(path)]
if missing:
    print("MISSING real source files -- stopping, not writing placeholders:")
    for name, path in missing:
        print(f"  {name}: {path}")
    raise SystemExit(1)

for name, path in SOURCES.items():
    shutil.copyfile(path, os.path.join(OUT, name))
    print(f"copied {name} ({os.path.getsize(path)/1024:.0f} KB)")

# ---- JSONL audit logs -> JSON arrays (easier to fetch/parse in the browser) ----
for name, path in [
    ("audit_log_national.json", os.path.join(NAIP, "backend", "insurance_engine", "audit_log.jsonl")),
    ("audit_log_demo.json", os.path.join(NAIP, "backend", "insurance_engine", "audit_log_demo.jsonl")),
    ("delivery_log.json", os.path.join(NAIP, "delivery", "sms_ussd_ivr", "delivery_log.jsonl")),
]:
    if not os.path.exists(path):
        print(f"MISSING {path} -- stopping")
        raise SystemExit(1)
    with open(path, encoding="utf-8") as f:
        records = [json.loads(line) for line in f if line.strip()]
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False)
    print(f"converted {os.path.basename(path)} -> {name} ({len(records)} records)")

# ---- per-district hazard summary, for the choropleth (real aggregation, not new data) ----
with open(os.path.join(NAIP, "backend", "alerts", "district_alerts.json"), encoding="utf-8") as f:
    da = json.load(f)

by_district = defaultdict(lambda: {"n_rows": 0, "n_triggered_rows": 0, "hazards_triggered": defaultdict(int),
                                     "lat": None, "lon": None})
for row in da["district_day_hazard_rows"]:
    d = by_district[row["district"]]
    d["n_rows"] += 1
    d["lat"] = row["lat"]
    d["lon"] = row["lon"]
    if row["any_flag"]:
        d["n_triggered_rows"] += 1
        d["hazards_triggered"][row["hazard"]] += 1

district_summary = []
for name, d in by_district.items():
    district_summary.append({
        "district": name, "lat": d["lat"], "lon": d["lon"],
        "n_rows": d["n_rows"], "n_triggered_rows": d["n_triggered_rows"],
        "hazards_triggered": dict(d["hazards_triggered"]),
    })
with open(os.path.join(OUT, "district_hazard_summary.json"), "w", encoding="utf-8") as f:
    json.dump({
        "generated_from": "district_alerts.json (real, Week 1)",
        "note": "Aggregated here (count of triggered rows per district/hazard) for the map "
                "choropleth -- the underlying district_alerts.json (also in this folder) has "
                "the full per-date detail.",
        "districts": district_summary,
    }, f, ensure_ascii=False)
print(f"wrote district_hazard_summary.json ({len(district_summary)} districts)")

# ---- farm registry: no live DB, so regenerate the real in-memory output as JSON ----
import sys
sys.path.insert(0, os.path.join(NAIP, "backend", "farm_registry"))
from in_memory_registry import load_registry  # noqa: E402

reg = load_registry(
    os.path.join(NAIP, "data", "seed", "farms_layyahMuridke_Kharif2025.geojson"),
    os.path.join(NAIP, "data", "seed", "pk_districts.geojson"),
)
farms_out = [{
    "farm_id": f.farm_id, "district": f.district, "centroid_lat": f.centroid_lat,
    "centroid_lon": f.centroid_lon, "area_ha": round(f.area_ha, 3),
    "boundary": f.boundary_geojson,
} for f in reg.farms.values()]
with open(os.path.join(OUT, "farms.json"), "w", encoding="utf-8") as f:
    json.dump({
        "note": "Real 120-farm Layyah/Muridke seed set, real point-in-polygon district "
                "assignment (in_memory_registry.py, Week 4 -- no live PostGIS deployed). "
                "crop_type/farmer_id/CNIC all null, same real gap as every prior week.",
        "n_farms": len(farms_out),
        "districts_with_coverage": sorted({f["district"] for f in farms_out}),
        "farms": farms_out,
    }, f, ensure_ascii=False)
print(f"wrote farms.json ({len(farms_out)} real farms, districts: "
      f"{sorted({f['district'] for f in farms_out})})")

# ---- demo scenario: pull the exact Layyah/2026-07-06 record from the demo audit log ----
with open(os.path.join(OUT, "audit_log_demo.json"), encoding="utf-8") as f:
    demo_records = json.load(f)
scenario = next((r for r in demo_records if r["district"] == "Layyah" and r["date"] == "20260706"), None)
if scenario is None:
    print("MISSING the Layyah/20260706 demo scenario record in audit_log_demo -- stopping")
    raise SystemExit(1)
with open(os.path.join(OUT, "demo_scenario.json"), "w", encoding="utf-8") as f:
    json.dump({
        "note": "The real output of naip/run_end_to_end_demo.py --district Layyah --threshold 0.20, "
                "Week 4's demo-day scenario -- not a mockup.",
        "record": scenario,
    }, f, ensure_ascii=False)
print("wrote demo_scenario.json")

print("\nAll real data prepared. Nothing fabricated.")
