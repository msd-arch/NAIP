"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import CaveatBanner from "../components/CaveatBanner";
import SegmentProfileChart from "../components/SegmentProfileChart";

const CanalMap = dynamic(() => import("../components/CanalMap"), { ssr: false });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface FloodDistrictScore {
  district: string;
  mean_model_score: number;
}

interface FloodSummary {
  during_window: [string, string];
  n_districts_flagged_raw: number;
  n_districts_total: number;
  flag_threshold: number;
  score_distribution: { min: number; median: number; max: number; p10: number; p90: number };
  districts_below_threshold: FloodDistrictScore[];
  top5_by_score: FloodDistrictScore[];
  domain_shift_finding: { headline: string; explanation: string };
  not_merged_reason: string;
  caveats: string[];
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

export default function WaterStressPage() {
  const [data, setData] = useState<WaterStress | null>(null);
  const [flood, setFlood] = useState<FloodSummary | null>(null);

  useEffect(() => {
    fetch(`${BASE}/data/water_stress.json`).then((r) => r.json()).then(setData);
    fetch(`${BASE}/data/track_d_dashboard_summary.json`).then((r) => r.json()).then(setFlood);
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading real canal water-stress data...</p>;

  const { head_vs_tail: hvt, flow_direction_check: fd } = data;

  return (
    <div>
      <h1 className="text-xl font-semibold">Water Stress &mdash; {data.canal_name}</h1>
      <p className="mt-1 text-sm text-dim">{data.geometry_source}</p>

      <CaveatBanner>{data.scope}</CaveatBanner>

      <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
        <h2 className="text-sm font-semibold">Flow direction &mdash; verified, not assumed</h2>
        <p className="mt-1 text-xs text-dim">
          The original head/tail labeling was a geometric guess (Week 2). It was
          independently cross-checked against real SRTM elevation ({fd.source}):
          elevation drops <strong className="text-main">{fd.total_drop_m}m</strong> over{" "}
          {fd.span_km}km (slope {fd.slope_m_per_km} m/km, correlation{" "}
          {fd.correlation_dist_vs_elevation}) &mdash; a clean, monotonic downhill trend.
          Verdict: <strong className="text-accent-500">{fd.verdict}</strong>. The tail-end
          stress finding below is confirmed, not reversed.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
          <Stat label="Head elevation" value={`${hvt.head_elevation_m_srtm}m`} />
          <Stat label="Head stress index" value={hvt.head_stress_index.toFixed(3)} />
          <Stat label="Tail elevation" value={`${hvt.tail_elevation_m_srtm}m`} />
          <Stat label="Tail stress index" value={hvt.tail_stress_index.toFixed(3)} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-soft bg-elev p-4">
          <h2 className="mb-2 text-sm font-semibold">Head-to-tail profile</h2>
          <SegmentProfileChart segments={data.segments} />
          <p className="mt-2 text-xs text-faint">{data.stress_index_definition}</p>
        </div>
        <CanalMap segments={data.segments} />
      </div>

      <p className="mt-4 text-xs text-faint">{data.et_source}</p>

      <hr className="mt-10 border-soft" />

      <h2 className="mt-8 text-base font-semibold">
        Flood risk (Track D) &mdash; a separate module, not part of this canal&apos;s index
      </h2>
      <p className="mt-1 text-sm text-dim">
        Shares the water theme with the canal-stress work above but is a genuinely
        different, national-scope model (real Sentinel-1 SAR + JRC Global Surface
        Water) &mdash; kept here as its own clearly-bounded section, not folded into
        the canal water-stress numbers above.
      </p>

      {!flood ? (
        <p className="mt-4 text-sm text-dim">Loading live flood screen...</p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-[#e5484d]/40 bg-[#e5484d]/10 p-4 text-sm">
            <strong className="text-main">Not a flood alert.</strong>{" "}
            <span className="text-dim">
              Live screen ({flood.during_window[0]} to {flood.during_window[1]}) flagged{" "}
              {flood.n_districts_flagged_raw}/{flood.n_districts_total} districts at the raw{" "}
              {flood.flag_threshold} model cutoff &mdash; not reported as real current
              flooding. Full detail: <code>/models-in-production</code>.
            </span>
          </div>
          <p className="mt-3 text-sm text-dim">{flood.domain_shift_finding.headline}</p>
          <p className="mt-2 text-xs text-faint">{flood.domain_shift_finding.explanation}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-faint sm:grid-cols-2">
            <span>
              Score range: <span className="tnum text-dim">{flood.score_distribution.min.toFixed(3)}</span> to{" "}
              <span className="tnum text-dim">{flood.score_distribution.max.toFixed(3)}</span>, median{" "}
              <span className="tnum text-dim">{flood.score_distribution.median.toFixed(3)}</span>
            </span>
            <span>
              Below threshold: {flood.districts_below_threshold.map((d) => d.district).join(", ")}
            </span>
          </div>
          <CaveatBanner>{flood.not_merged_reason}</CaveatBanner>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tnum text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}
