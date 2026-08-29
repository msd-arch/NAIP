"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import SegmentProfileChart from "../components/SegmentProfileChart";

const CanalMap = dynamic(() => import("../components/CanalMap"), { ssr: false });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface FloodDistrictScore {
  district: string;
  mean_model_score: number;
}

interface FloodSummary {
  model_version: string;
  status: string;
  last_computed_utc?: string;
  during_window: [string, string];
  n_districts_flagged_raw: number;
  n_districts_total: number;
  flag_threshold: number;
  score_distribution: { min: number; median: number; max: number; p10: number; p90: number };
  districts_below_threshold: FloodDistrictScore[];
  top5_by_score: (FloodDistrictScore & { mean_precip_anomaly_pct?: number })[];
  real_fair_test_validation: {
    note: string;
    original_model: { precision: number; recall: number; f1: number; roc_auc: number | null };
    v2_model_rejected: { precision: number; recall: number; f1: number; roc_auc: number | null };
    v3_model_deployed: { precision: number; recall: number; f1: number; roc_auc: number | null };
    score_separation_diagnostic: { original: { separation_gap: number }; v2: { separation_gap: number }; v3_precip: { separation_gap: number } };
  };
  nine_district_investigation: { headline: string; caveat: string };
  threshold_decision: { national_illustrative: number; demo: number; note: string };
  wired_into_trigger_engine: boolean;
  trigger_engine_effect: string;
  caveats: string[];
}

interface DroughtDistrict {
  district: string;
  tier: string;
  n_points: number;
  mean_z_score: number;
  mean_current_ndvi: number;
  mean_historical_ndvi: number;
  district_flag: boolean;
}

interface DroughtNational {
  last_computed_utc?: string;
  refresh_cadence_note?: string;
  method: string;
  cross_sensor_bias_finding: string;
  systematic_offset_finding: string;
  flag_threshold_percentile_this_year: number;
  n_points_total: number;
  n_districts_covered: number;
  n_districts_total_seed: number;
  tier_breakdown_districts: Record<string, number>;
  z_score_distribution: {
    mean: number; std: number; min: number; p10: number; p25: number;
    median: number; p75: number; p90: number; max: number;
  };
  n_districts_flagged: number;
  district_results: DroughtDistrict[];
}

interface WaterStress {
  canal_name: string;
  scope: string;
  geometry_source: string;
  et_source: string;
  stress_index_definition: string;
  n_segments: number;
  n_segments_with_valid_index: number;
  segments: Array<{
    segment_id: number; dist_from_head_km: number; position: string;
    lat: number; lon: number; season_et_mm: number | null; season_pet_mm: number | null;
    stress_index: number | null; elevation_m_srtm: number | null;
  }>;
  head_vs_tail: {
    head_dist_km: number; head_stress_index: number; head_elevation_m_srtm: number;
    tail_dist_km: number; tail_stress_index: number; tail_elevation_m_srtm: number;
    flow_direction_verdict: string;
  };
  flow_direction_check: {
    source: string; elevation_head_m: number; elevation_tail_m: number;
    total_drop_m: number; span_km: number; slope_m_per_km: number;
    correlation_dist_vs_elevation: number; verdict: string;
  };
}

function NdviCompareBar({ district }: { district: DroughtDistrict }) {
  const max = Math.max(district.mean_current_ndvi, district.mean_historical_ndvi, 0.1) * 1.15;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-main">{district.district}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[10px] text-faint">now</span>
          <div className="h-2.5 flex-1 rounded-full bg-elev-2">
            <div className="h-full rounded-full bg-critical/70" style={{ width: `${(district.mean_current_ndvi / max) * 100}%` }} />
          </div>
          <span className="tnum w-12 shrink-0 text-right text-[10px] text-dim">{district.mean_current_ndvi.toFixed(3)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[10px] text-faint">usual</span>
          <div className="h-2.5 flex-1 rounded-full bg-elev-2">
            <div className="h-full rounded-full bg-accent-500" style={{ width: `${(district.mean_historical_ndvi / max) * 100}%` }} />
          </div>
          <span className="tnum w-12 shrink-0 text-right text-[10px] text-dim">{district.mean_historical_ndvi.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}

export default function WaterStressPage() {
  const [data, setData] = useState<WaterStress | null>(null);
  const [flood, setFlood] = useState<FloodSummary | null>(null);
  const [drought, setDrought] = useState<DroughtNational | null>(null);

  useEffect(() => {
    fetch(`${BASE}/data/water_stress.json`).then((r) => r.json()).then(setData);
    fetch(`${BASE}/data/track_d_dashboard_summary.json`).then((r) => r.json()).then(setFlood);
    fetch(`${BASE}/data/drought_national.json`).then((r) => r.json()).then(setDrought);
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading...</p>;

  const { head_vs_tail: hvt } = data;

  return (
    <div>
      <h1 id="canal-water-stress" className="scroll-mt-20 text-xl font-semibold">Water Stress &mdash; {data.canal_name}</h1>
      <p className="mt-2 text-sm text-dim">
        Water in a canal gets used up as it travels, so the far end (the &ldquo;tail&rdquo;)
        usually gets less water than the start (the &ldquo;head&rdquo;). This tracks that
        difference along the canal.
      </p>

      <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
        <div className="mt-1 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
          <Stat label="Head elevation" value={`${hvt.head_elevation_m_srtm}m`} />
          <Stat label="Head stress" value={hvt.head_stress_index.toFixed(3)} />
          <Stat label="Tail elevation" value={`${hvt.tail_elevation_m_srtm}m`} />
          <Stat label="Tail stress" value={hvt.tail_stress_index.toFixed(3)} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-soft bg-elev p-4">
          <h2 className="mb-2 text-sm font-semibold">Head-to-tail profile</h2>
          <SegmentProfileChart segments={data.segments} />
          <p className="mt-2 text-xs text-faint">Higher number = drier, more stressed section of canal.</p>
        </div>
        <CanalMap segments={data.segments} />
      </div>

      <hr className="mt-10 border-soft" />

      <h2 id="flood-risk" className="mt-8 scroll-mt-20 text-base font-semibold">Flood Risk Screen</h2>
      <p className="mt-2 text-sm text-dim">
        This checks satellite images of rainfall and ground wetness to guess how likely
        flooding is in each district right now. It&apos;s an early-warning signal, not a
        confirmed flood alert.
      </p>

      {!flood ? (
        <p className="mt-4 text-sm text-dim">Loading...</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-dim">
            Right now: {flood.n_districts_flagged_raw} of {flood.n_districts_total} districts
            show a raised flood-risk signal.
          </p>

          {flood.districts_below_threshold.length < flood.n_districts_total && (
            <div className="mt-3 rounded-xl border border-soft bg-elev p-4">
              <h3 className="mb-2 text-sm font-semibold">How well this works</h3>
              <p className="text-xs text-dim">
                We tested this against a real flood year the model had never seen before.
                Out of every 100 places it flagged as flooded, about 19 really were &mdash;
                still far from perfect, but a real improvement over earlier versions.
              </p>
            </div>
          )}
          <LastComputed iso={flood.last_computed_utc} />
        </>
      )}

      <hr className="mt-10 border-soft" />

      <h2 id="drought-signal" className="mt-8 scroll-mt-20 text-base font-semibold">National Drought Signal</h2>
      <p className="mt-2 text-sm text-dim">
        This compares how green and healthy plants look right now against how they usually
        look at this time of year, using satellite images. A big drop from normal means an
        area may be drier than it should be.
      </p>

      {!drought ? (
        <p className="mt-4 text-sm text-dim">Loading...</p>
      ) : (
        <>
          <h3 className="mt-6 text-sm font-semibold text-main">
            Result: {drought.n_districts_flagged} of {drought.n_districts_covered} districts
            currently look drier than usual
          </h3>
          <p className="mt-1 text-sm text-dim">
            Districts flagged: {drought.district_results.filter(d => d.district_flag).map(d => d.district).join(", ") || "none"}
          </p>

          {drought.district_results.filter((d) => d.district_flag).length > 0 && (
            <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
              <h4 className="mb-1 text-sm font-semibold">Now vs. usual</h4>
              {drought.district_results.filter((d) => d.district_flag).map((d) => (
                <NdviCompareBar key={d.district} district={d} />
              ))}
            </div>
          )}
          <LastComputed iso={drought.last_computed_utc} />
        </>
      )}
    </div>
  );
}

function LastComputed({ iso }: { iso?: string }) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  const label = mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 2880 ? `${Math.round(mins / 60)} hr ago` : `${Math.round(mins / 1440)} days ago`;
  return <p className="mt-2 text-[11px] text-faint">Last computed <span className="tnum">{label}</span> — recomputed on a real weekly schedule, not every 15 min.</p>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tnum text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}
