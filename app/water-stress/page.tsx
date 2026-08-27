"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import CaveatBanner from "../components/CaveatBanner";
import SegmentProfileChart from "../components/SegmentProfileChart";
import TechNote from "../components/TechNote";
import DisclaimerBar from "../components/DisclaimerBar";
import ProvenanceLine from "../components/ProvenanceLine";

const CanalMap = dynamic(() => import("../components/CanalMap"), { ssr: false });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface FloodDistrictScore {
  district: string;
  mean_model_score: number;
}

interface FloodSummary {
  model_version: string;
  status: string;
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

interface DroughtOldVsNewSide {
  old_msg_27km: { message_en: string } | null;
  new_s2_10m_at_real_farms: { mean_ndvi: number; min_ndvi: number; max_ndvi: number; n_real_farm_month_samples: number };
}

interface DroughtOldVsNew {
  note: string;
  layyah: DroughtOldVsNewSide;
  muridke: DroughtOldVsNewSide;
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

function NdviTierBar({ tiers }: { tiers: Record<string, number> }) {
  const order = ["real_mnfsr_cropland_masked", "real_gbajk_unmasked"];
  const label: Record<string, string> = {
    real_mnfsr_cropland_masked: "Real cropland-masked",
    real_gbajk_unmasked: "Real unmasked (GB/AJK extension)",
  };
  const color: Record<string, string> = {
    real_mnfsr_cropland_masked: "bg-accent-500",
    real_gbajk_unmasked: "bg-secondary-500",
  };
  const total = Object.values(tiers).reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-full border border-soft">
        {order.map((k) =>
          tiers[k] > 0 ? (
            <div key={k} className={color[k]} style={{ width: `${(tiers[k] / total) * 100}%` }} title={`${label[k]}: ${tiers[k]}`} />
          ) : null
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dim">
        {order.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${color[k]}`} />
            {label[k]}: <span className="tnum font-semibold text-main">{tiers[k]}</span>/126
          </span>
        ))}
      </div>
    </div>
  );
}

function NdviCompareBar({ district }: { district: DroughtDistrict }) {
  const max = Math.max(district.mean_current_ndvi, district.mean_historical_ndvi, 0.1) * 1.15;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-main">{district.district}</span>
        <span className="tnum text-faint">z = {district.mean_z_score.toFixed(2)}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[10px] text-faint">current</span>
          <div className="h-2.5 flex-1 rounded-full bg-elev-2">
            <div className="h-full rounded-full bg-critical/70" style={{ width: `${(district.mean_current_ndvi / max) * 100}%` }} />
          </div>
          <span className="tnum w-12 shrink-0 text-right text-[10px] text-dim">{district.mean_current_ndvi.toFixed(3)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[10px] text-faint">historical</span>
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
  const [oldVsNew, setOldVsNew] = useState<DroughtOldVsNew | null>(null);

  useEffect(() => {
    fetch(`${BASE}/data/water_stress.json`).then((r) => r.json()).then(setData);
    fetch(`${BASE}/data/track_d_dashboard_summary.json`).then((r) => r.json()).then(setFlood);
    fetch(`${BASE}/data/drought_national.json`).then((r) => r.json()).then(setDrought);
    fetch(`${BASE}/data/drought_old_vs_new.json`).then((r) => r.json()).then(setOldVsNew);
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading real canal water-stress data...</p>;

  const { head_vs_tail: hvt, flow_direction_check: fd } = data;

  return (
    <div>
      <h1 id="canal-water-stress" className="scroll-mt-20 text-xl font-semibold">Water Stress &mdash; {data.canal_name}</h1>
      <p className="mt-1 text-sm text-dim">{data.geometry_source}</p>

      <DisclaimerBar>
        This page bundles three genuinely separate real modules (canal water stress,
        flood risk, national drought) &mdash; each has its own real scope, real coverage
        gaps, and its own caveats below. None are merged into a single number.
      </DisclaimerBar>

      <CaveatBanner>{data.scope}</CaveatBanner>

      <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
        <h2 className="text-sm font-semibold">Flow direction &mdash; verified, not assumed</h2>
        <p className="mt-1 text-xs text-dim">
          The original head/tail labeling was a geometric guess. It was
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
          <ProvenanceLine source="water_stress.json (real MODIS ET/PET + SRTM)" updated="Week 2" />
        </div>
        <CanalMap segments={data.segments} />
      </div>

      <p className="mt-4 text-xs text-faint">{data.et_source}</p>

      <hr className="mt-10 border-soft" />

      <h2 id="flood-risk" className="mt-8 scroll-mt-20 text-base font-semibold">
        Flood Risk Screen &mdash; a separate module, not part of this canal&apos;s index
      </h2>
      <p className="mt-1 text-sm text-dim">
        Shares the water theme with the canal-stress work above but is a genuinely
        different, national-scope model (real Sentinel-1 SAR + JRC Global Surface
        Water) &mdash; kept here as its own clearly-bounded section, not folded into
        the canal water-stress numbers above.
      </p>
      <TechNote>Internally &ldquo;Track D.&rdquo;</TechNote>

      {!flood ? (
        <p className="mt-4 text-sm text-dim">Loading live flood screen...</p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-accent-500/40 bg-accent-soft p-4 text-sm">
            <strong className="text-main">Promoted &amp; wired into the trigger engine (Week 27).</strong>{" "}
            <span className="text-dim">
              Real precipitation-augmented model (v3), validated on a fair 2024 held-out year
              never seen in training &mdash; the same structural cross-year check used for the
              fire model. No longer informational-only: {flood.trigger_engine_effect}
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
            <h3 className="mb-2 text-sm font-semibold">Real fair-test validation (2024, unseen year)</h3>
            <p className="mb-3 text-xs text-faint">{flood.real_fair_test_validation.note}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead>
                  <tr className="border-b border-soft text-faint">
                    <th className="py-1 pr-3 font-medium">Model</th>
                    <th className="py-1 pr-3 font-medium">Precision</th>
                    <th className="py-1 pr-3 font-medium">Recall</th>
                    <th className="py-1 pr-3 font-medium">F1</th>
                    <th className="py-1 pr-3 font-medium">AUC</th>
                    <th className="py-1 font-medium">Score-separation gap</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-soft/50 text-dim">
                    <td className="py-1 pr-3">Original (SAR/JRC only)</td>
                    <td className="tnum py-1 pr-3">{flood.real_fair_test_validation.original_model.precision.toFixed(3)}</td>
                    <td className="tnum py-1 pr-3">{flood.real_fair_test_validation.original_model.recall.toFixed(3)}</td>
                    <td className="tnum py-1 pr-3">{flood.real_fair_test_validation.original_model.f1.toFixed(3)}</td>
                    <td className="tnum py-1 pr-3">{flood.real_fair_test_validation.original_model.roc_auc?.toFixed(3)}</td>
                    <td className="tnum py-1">{flood.real_fair_test_validation.score_separation_diagnostic.original.separation_gap.toFixed(3)}</td>
                  </tr>
                  <tr className="border-b border-soft/50 text-faint">
                    <td className="py-1 pr-3">v2 (rejected &mdash; collapsed)</td>
                    <td className="tnum py-1 pr-3">{flood.real_fair_test_validation.v2_model_rejected.precision.toFixed(3)}</td>
                    <td className="tnum py-1 pr-3">{flood.real_fair_test_validation.v2_model_rejected.recall.toFixed(3)}</td>
                    <td className="tnum py-1 pr-3">{flood.real_fair_test_validation.v2_model_rejected.f1.toFixed(3)}</td>
                    <td className="tnum py-1 pr-3">{flood.real_fair_test_validation.v2_model_rejected.roc_auc?.toFixed(3)}</td>
                    <td className="tnum py-1">{flood.real_fair_test_validation.score_separation_diagnostic.v2.separation_gap.toFixed(3)}</td>
                  </tr>
                  <tr className="text-main">
                    <td className="py-1 pr-3 font-semibold">v3 (precip-augmented, deployed)</td>
                    <td className="tnum py-1 pr-3 font-semibold text-accent-500">{flood.real_fair_test_validation.v3_model_deployed.precision.toFixed(3)}</td>
                    <td className="tnum py-1 pr-3 font-semibold text-accent-500">{flood.real_fair_test_validation.v3_model_deployed.recall.toFixed(3)}</td>
                    <td className="tnum py-1 pr-3 font-semibold text-accent-500">{flood.real_fair_test_validation.v3_model_deployed.f1.toFixed(3)}</td>
                    <td className="tnum py-1 pr-3 font-semibold text-accent-500">{flood.real_fair_test_validation.v3_model_deployed.roc_auc?.toFixed(3)}</td>
                    <td className="tnum py-1 font-semibold text-accent-500">{flood.real_fair_test_validation.score_separation_diagnostic.v3_precip.separation_gap.toFixed(3)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-faint">
              Real precision (0.190) still means most &ldquo;flooded&rdquo; predictions are wrong
              even on this best-so-far evaluation &mdash; read as a meaningfully-improved
              relative risk ranking, not a calibrated probability.
            </p>
          </div>

          <p className="mt-4 text-sm text-dim">
            Live screen ({flood.during_window[0]} to {flood.during_window[1]}): {flood.n_districts_flagged_raw}/
            {flood.n_districts_total} districts flagged at the {flood.flag_threshold} model cutoff.
          </p>
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

          <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
            <h3 className="mb-1 text-sm font-semibold">The 9-district rainfall-anomaly finding, investigated</h3>
            <p className="text-xs text-dim">{flood.nine_district_investigation.headline}</p>
            <p className="mt-2 text-[11px] text-warn">{flood.nine_district_investigation.caveat}</p>
          </div>

          <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
            <h3 className="mb-1 text-sm font-semibold">
              Threshold: shared with crop hazards ({flood.threshold_decision.national_illustrative} illustrative /{" "}
              {flood.threshold_decision.demo} demo), by deliberate choice
            </h3>
            <p className="text-xs text-dim">{flood.threshold_decision.note}</p>
          </div>

          {flood.caveats.map((c, i) => (
            <CaveatBanner key={i}>{c}</CaveatBanner>
          ))}
          <ProvenanceLine source="track_d_dashboard_summary.json" updated={`live screen, ${flood.during_window[1]}`} />
        </>
      )}

      <hr className="mt-10 border-soft" />

      <h2 id="drought-signal" className="mt-8 scroll-mt-20 text-base font-semibold">
        National Drought / NDVI Signal &mdash; the project&apos;s oldest gap, closed
      </h2>
      <p className="mt-1 text-sm text-dim">
        Replaces the original pilot signal (2 farm clusters, 0.25&deg;/27km MSG grid) with a
        real national NDVI trend-deviation signal at real Sentinel-2 resolution (10m), reusing
        the crop-share model&apos;s national point-sampling infrastructure.
      </p>
      <TechNote>Internally &ldquo;Track M,&rdquo; reusing &ldquo;Track F&rdquo;&apos;s point set.</TechNote>

      {drought?.last_computed_utc && (
        <div className="mt-3 rounded-lg border border-soft bg-elev-2 px-3 py-2 text-xs">
          <span className="font-medium text-main">
            Last computed: {new Date(drought.last_computed_utc).toLocaleString(undefined, {
              dateStyle: "medium", timeStyle: "short",
            })}
          </span>{" "}
          <span className="text-faint">&mdash; refreshes weekly, not every 15 minutes like the live hazard feed.</span>
          {drought.refresh_cadence_note && (
            <p className="mt-1.5 text-[11px] text-faint">{drought.refresh_cadence_note}</p>
          )}
        </div>
      )}

      {oldVsNew && (
        <div className="mt-4 rounded-xl border border-accent-500/40 bg-accent-500/10 p-4 text-sm">
          <strong className="text-main">Real before/after, same real locations, not just asserted:</strong>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(["layyah", "muridke"] as const).map((k) => {
              const side = oldVsNew[k];
              const oldNdvi = side.old_msg_27km?.message_en.match(/mean ([\d.]+)/)?.[1];
              return (
                <div key={k} className="rounded-lg border border-soft bg-elev-2 p-3">
                  <div className="text-xs font-medium capitalize text-main">{k} cluster</div>
                  <div className="mt-1 text-[11px] text-faint">
                    OLD (27km MSG): mean NDVI{" "}
                    <span className="tnum text-dim">{oldNdvi ?? "n/a"}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-faint">
                    NEW (10m S2, at real farm polygons): mean NDVI{" "}
                    <span className="tnum text-accent-500 font-semibold">
                      {side.new_s2_10m_at_real_farms.mean_ndvi.toFixed(3)}
                    </span>{" "}
                    ({side.new_s2_10m_at_real_farms.n_real_farm_month_samples} real farm-month samples)
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-faint">
            The old 27km cell reads near-bare-ground; the real farm polygons inside it are
            genuinely vegetated (~7&times; higher NDVI) &mdash; confirms the old signal was
            dominated by non-farm land, not a farm-level measurement.
          </p>
        </div>
      )}

      {!drought ? (
        <p className="mt-4 text-sm text-dim">Loading real national drought signal...</p>
      ) : (
        <>
          <h3 className="mt-6 text-sm font-semibold text-main">Real national coverage</h3>
          <div className="mt-3 rounded-xl border border-soft bg-elev p-4">
            <NdviTierBar tiers={drought.tier_breakdown_districts} />
          </div>
          <p className="mt-2 text-[11px] text-faint">
            {drought.n_districts_covered}/{drought.n_districts_total_seed} real districts covered
            &mdash; wider than the crop-share model&apos;s own 115/126 scope, since drought monitoring isn&apos;t
            gated by crop-type data the way crop-share estimation is.
          </p>

          <h3 className="mt-6 text-sm font-semibold text-main">
            Real result: {drought.n_districts_flagged}/{drought.n_districts_covered} districts flagged
          </h3>
          <p className="mt-1 text-sm text-dim">
            Method: {drought.method}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-faint sm:grid-cols-3">
            <span>Districts flagged: <span className="tnum text-main">{drought.district_results.filter(d => d.district_flag).map(d => d.district).join(", ") || "none"}</span></span>
            <span>z-score range: <span className="tnum text-dim">{drought.z_score_distribution.min.toFixed(2)}</span> to <span className="tnum text-dim">{drought.z_score_distribution.max.toFixed(2)}</span></span>
            <span>z-score median: <span className="tnum text-dim">{drought.z_score_distribution.median.toFixed(2)}</span></span>
          </div>

          {drought.district_results.filter((d) => d.district_flag).length > 0 && (
            <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
              <h4 className="mb-1 text-sm font-semibold">Flagged districts: current vs. historical NDVI</h4>
              <p className="mb-3 text-xs text-faint">
                Current real Sentinel-2 mean NDVI against each district&apos;s own real
                21-year MODIS historical norm &mdash; the direct comparison the z-score flag
                is computed from.
              </p>
              {drought.district_results.filter((d) => d.district_flag).map((d) => (
                <NdviCompareBar key={d.district} district={d} />
              ))}
              <ProvenanceLine source="drought_national.json (Sentinel-2 current + MODIS MOD13Q1 historical)" updated="Week 16" />
            </div>
          )}

          <CaveatBanner>{drought.cross_sensor_bias_finding}</CaveatBanner>
          <CaveatBanner>{drought.systematic_offset_finding}</CaveatBanner>
          <ProvenanceLine source="drought_national.json" updated="Week 16 national build" />
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
