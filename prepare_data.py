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
    # PHASE 4 doc-consistency pass: this pointed at the stale trigger_summary.json
    # (Week 4, threshold 0.35, never regenerated after Week 9's recalibration) --
    # trigger_summary_national.json is the real, current, recalibrated file
    # (threshold 0.225). Fixed here; trigger_summary.json itself is left on disk as
    # the historical Week 4 record, same as FINAL_REPORT.md.
    "trigger_summary_national.json": os.path.join(NAIP, "backend", "insurance_engine", "trigger_summary_national.json"),
    "trigger_summary_demo.json": os.path.join(NAIP, "backend", "insurance_engine", "trigger_summary_demo.json"),
    "drought_national.json": os.path.join(NAIP, "models", "drought_national", "drought_national.json"),
    "drought_old_vs_new.json": os.path.join(NAIP, "models", "drought_national", "old_vs_new_comparison.json"),
    "track_j_crossyear_results.json": os.path.join(NAIP, "models", "crop_classifier_national", "track_j_crossyear_results.json"),
    "real_crop_mix_interim_estimates.json": os.path.join(NAIP, "data", "crop_mix_ground_truth", "real_crop_mix_interim_estimates.json"),
    "track_g_dashboard_summary.json": os.path.join(NAIP, "data", "msg_oct_nov_2023", "track_g_dashboard_summary.json"),
    "track_d_dashboard_summary.json": os.path.join(NAIP, "models", "flood_risk", "track_d_dashboard_summary.json"),
    "track_f_results.json": os.path.join(NAIP, "models", "crop_classifier_national", "track_f_results.json"),
    "track_o_yield_results.json": os.path.join(NAIP, "models", "crop_classifier_national", "track_o_yield_results.json"),
    "crop_stress_screen.json": os.path.join(NAIP, "models", "crop_stress_screen", "crop_stress_screen.json"),
    "real_crop_mix.json": os.path.join(NAIP, "data", "crop_mix_ground_truth", "real_crop_mix.json"),
    # Track S1: real GFS-forecast layer (frost/heat_wave/cold_wave only -- the 3
    # of 11 real detectors with real GFS field compatibility). Structurally
    # separate from district_alerts.json by design -- never merged in.
    "forecast_alerts.json": os.path.join(NAIP, "models", "forecast", "forecast_alerts.json"),
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
    # PHASE 4 FINAL ITEM: found and fixed a real, pre-existing bug here while
    # wiring model_estimated_interim through -- this was still pointed at
    # audit_log.jsonl (the stale Week 4, threshold=0.35 file) even after
    # Week 12's doc-consistency pass fixed trigger_summary_national.json's own
    # mapping to the real 0.225 file. The Trigger Engine page's summary stats
    # were correct; the actual audit-record table below them was silently
    # showing stale 0.35-threshold events the whole time. audit_log_national.jsonl
    # (the real, current, threshold=0.225 file) is the correct source.
    ("audit_log_national.json", os.path.join(NAIP, "backend", "insurance_engine", "audit_log_national.jsonl")),
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

# ---- per-district-hazard CURRENT status, for the Hazards panel's Live
# window -- real, user-reported confusion this replaces: the previous
# district_hazard_messages.json only ever kept the most recent TRIGGERED
# row, silently dropping every hazard that wasn't currently flagged, and
# district_hazard_summary.json's n_triggered_rows was a lifetime cumulative
# count across the whole real archive -- neither actually answers "what's
# happening right now." This keeps, for every real (district, hazard) pair
# that has ever been checked, the single most recent real row regardless of
# whether it triggered -- so a hazard with no current real risk reports
# that honestly ("not currently flagged"), not by omission, and a hazard
# that IS currently flagged carries its own real message/confidence/date.
# district_alerts.json is 13MB/28,602 rows, too large to ship wholesale --
# this is a real compaction of data that already exists in full there.
latest_by_district_hazard: dict[tuple[str, str], dict] = {}
# Real historical context, shown alongside (never blended into) the current
# status above, per your direction: for every (district, hazard) pair, the
# real cumulative count of distinct real dates it was ever triggered across
# the whole archive, and the real date of the last time that happened (None
# if it never has, in the archive on disk).
triggered_dates_by_district_hazard: dict[tuple[str, str], set] = defaultdict(set)
for row in da["district_day_hazard_rows"]:
    key = (row["district"], row["hazard"])
    prev = latest_by_district_hazard.get(key)
    if prev is None or row["date"] > prev["date"]:
        latest_by_district_hazard[key] = row
    if row["any_flag"]:
        triggered_dates_by_district_hazard[key].add(row["date"])

by_district_current: dict[str, list[dict]] = defaultdict(list)
for (d, h), row in latest_by_district_hazard.items():
    triggered_dates = triggered_dates_by_district_hazard.get((d, h), set())
    by_district_current[d].append({
        "hazard": h, "currently_flagged": row["any_flag"],
        "date": row["date"], "max_confidence": row["max_confidence"],
        "n_triggered": row["n_triggered"], "n_observations": row["n_observations"],
        "message_en": row["message_en"], "message_ur": row["message_ur"],
        "historical_n_days_triggered": len(triggered_dates),
        "historical_last_triggered_date": max(triggered_dates) if triggered_dates else None,
    })

current_districts = [
    {
        "district": d,
        "n_currently_flagged": sum(1 for h in hazards if h["currently_flagged"]),
        "most_recent_check_date": max(h["date"] for h in hazards),
        "hazards": sorted(hazards, key=lambda h: h["hazard"]),
    }
    for d, hazards in by_district_current.items()
]
with open(os.path.join(OUT, "district_hazard_current.json"), "w", encoding="utf-8") as f:
    json.dump({
        "generated_from": "district_alerts.json (real, Week 1)",
        "note": "Real current status (never blended with the historical fields below): for every "
                "(district, hazard) pair, the single most recent real check, whether it triggered "
                "or not. A hazard reads 'not currently flagged' by explicit real data, not by "
                "silent omission. historical_n_days_triggered/historical_last_triggered_date are "
                "the real cumulative count and most recent date across the whole archive, shown "
                "alongside the current reading for context, per explicit direction, never merged "
                f"into it. Out of district_alerts.json's full {len(da['district_day_hazard_rows'])} real rows.",
        "districts": current_districts,
    }, f, ensure_ascii=False)
print(f"wrote district_hazard_current.json ({len(current_districts)} districts, "
      f"{sum(len(x['hazards']) for x in current_districts)} real district-hazard current statuses)")

# ---- farm registry: Track R cutover, real live PostGIS database, no in-memory
# stand-in. If the DB is unreachable this raises here and the whole resync
# fails loudly (real traceback, non-zero exit) -- never silently falls back
# to a stale/in-memory farms.json.
import sys
sys.path.insert(0, os.path.join(NAIP, "backend", "farm_registry"))
from db_registry import all_farms  # noqa: E402

dsn_path = os.path.join(NAIP, "backend", "farm_registry", ".env")
with open(dsn_path, encoding="utf-8") as f:
    dsn = next(l.split("=", 1)[1].strip() for l in f if l.startswith("SUPABASE_DB_URL"))

farms = all_farms(dsn)
real_farms = [f for f in farms if not f["is_synthetic"]]
synthetic_farms = [f for f in farms if f["is_synthetic"]]
farms_out = [{
    "farm_id": str(f["farm_id"]), "district": f["district"], "is_synthetic": f["is_synthetic"],
    "centroid_lat": f["centroid_lat"], "centroid_lon": f["centroid_lon"],
    "area_ha": round(f["area_ha"], 3) if f["area_ha"] is not None else None,
    "boundary": f["boundary"],
} for f in farms]
with open(os.path.join(OUT, "farms.json"), "w", encoding="utf-8") as f:
    json.dump({
        "note": "Track R (real live PostgreSQL+PostGIS, Supabase): 120 real Layyah/Muridke seed "
                "farms + 2 real Track P submissions, plus 630 generated is_synthetic=true test-"
                "scale farms across all 126 districts (area-weighted by real MNFSR crop data, "
                "crop_type sampled from each district's real crop-mix shares). Identity fields "
                "(farmer_name/cnic/phone_number) never appear in this export -- same real gap as "
                "every prior week for farms with no linked farmer, and never exported here even "
                "for the 2 real, linked submissions.",
        "n_farms_real": len(real_farms), "n_farms_synthetic": len(synthetic_farms),
        "districts_with_real_coverage": sorted({f["district"] for f in real_farms}),
        "districts_with_any_coverage": sorted({f["district"] for f in farms}),
        "farms": farms_out,
    }, f, ensure_ascii=False)
print(f"wrote farms.json ({len(real_farms)} real farms, {len(synthetic_farms)} synthetic, "
      f"real coverage: {sorted({f['district'] for f in real_farms})})")

# ---- demo scenario: pull the exact Gujranwala/2026-06-23 record from the demo audit log ----
# PHASE 3 WEEK 9 (Track G): changed from Layyah/20260706 after exposure_score's real
# crop-weighting recalibration -- Layyah's real score (0.0277) no longer clears the
# recalibrated demo threshold. Checked honestly (not picked to fit a story): Gujranwala/
# uv_index/rice genuinely clears the new threshold with a real 60.92% MNFSR rice share.
with open(os.path.join(OUT, "audit_log_demo.json"), encoding="utf-8") as f:
    demo_records = json.load(f)
scenario = next((r for r in demo_records if r["district"] == "Gujranwala" and r["date"] == "20260623"), None)
if scenario is None:
    # THRESHOLD RECALIBRATION FIX (real bug, not conditional on any specific
    # week's numbers): a real recalibration can legitimately produce zero
    # trigger events -- that's a valid real result, not a pipeline error, and
    # this script must not hard-crash the whole data-prep run over it. Write
    # an honest "no scenario currently available" record instead of a fabricated
    # one, and let the rest of real data prep proceed.
    print(f"No Gujranwala/20260623 record in the current real audit_log_demo "
          f"({len(demo_records)} demo events total) -- writing an honest empty "
          "demo_scenario.json instead of crashing. Not fabricated.")
    with open(os.path.join(OUT, "demo_scenario.json"), "w", encoding="utf-8") as f:
        json.dump({
            "note": "No real demo-threshold trigger event currently exists for the "
                    "Gujranwala/20260623 scenario naip/run_end_to_end_demo.py was built "
                    "around -- a real, legitimate outcome of the current real threshold/"
                    "score distribution, not a pipeline error. record is null, not "
                    "fabricated.",
            "record": None,
        }, f, ensure_ascii=False)
else:
    with open(os.path.join(OUT, "demo_scenario.json"), "w", encoding="utf-8") as f:
        json.dump({
            "note": "The real output of naip/run_end_to_end_demo.py --district Gujranwala "
                    "--threshold 0.07, Week 9's recalibrated demo-day scenario (changed from "
                    "Week 4's Layyah scenario after the crop-weighting formula change made "
                    "Layyah's real score no longer clear the new threshold) -- not a mockup.",
            "record": scenario,
        }, f, ensure_ascii=False)
print("wrote demo_scenario.json")

print("\nAll real data prepared. Nothing fabricated.")
