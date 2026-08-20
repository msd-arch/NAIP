"use client";

import { useEffect, useState } from "react";
import CaveatBanner from "../components/CaveatBanner";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface GbAjkDistrict {
  district: string;
  n_points: number;
  predicted_shares: { wheat: number; cotton: number; rice: number; sugarcane: number };
  mean_abs_zscore_vs_training_distribution: number;
  flagged_out_of_distribution: boolean;
}

interface Summary {
  crop_share_model: {
    tier_breakdown_126_districts: Record<string, number>;
    gb_ajk_model_attempt: { note: string; districts: GbAjkDistrict[] };
  };
  fire_classifier: {
    real_window: string;
    n_records_compared: number;
    n_rule_flagged: number;
    n_model_flagged_ge_0_5?: number;
    "n_model_flagged_ge_0.5"?: number;
    both_flagged: number;
    rule_only: number;
    model_only: number;
    neither: number;
    mean_model_score: number;
    caveat: string;
  };
}

interface FloodDistrictScore {
  district: string;
  mean_model_score: number;
  n_rule_flagged?: number;
  n_points?: number;
}

interface FloodSummary {
  generated_note: string;
  during_window: [string, string];
  pre_monsoon_baseline_window: [string, string];
  flag_threshold: number;
  n_districts_flagged_raw: number;
  n_districts_total: number;
  score_distribution: {
    n: number; min: number; max: number; p10: number; p25: number;
    median: number; p75: number; p90: number; mean: number;
  };
  districts_below_threshold: FloodDistrictScore[];
  top5_by_score: FloodDistrictScore[];
  bottom5_by_score: FloodDistrictScore[];
  domain_shift_finding: {
    headline: string;
    training_flooded_class_centroid: Record<string, number>;
    training_not_flooded_class_centroid: Record<string, number>;
    live_2026_national_mean: Record<string, number>;
    explanation: string;
  };
  caveats: string[];
  not_merged_into_district_alerts: boolean;
  not_merged_reason: string;
}

const TIER_LABEL: Record<string, string> = {
  real_district_area: "Real MNFSR district data",
  model_predicted: "Model-predicted (Track F)",
  hand_classified_mask: "Hand-classified mask (fallback)",
};
const TIER_COLOR: Record<string, string> = {
  real_district_area: "bg-accent-500",
  model_predicted: "bg-[#7aa8c9]",
  hand_classified_mask: "bg-[#3a3a40]",
};

function TierBar({ tiers }: { tiers: Record<string, number> }) {
  const total = Object.values(tiers).reduce((a, b) => a + b, 0);
  const order = ["real_district_area", "model_predicted", "hand_classified_mask"];
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-full border border-soft">
        {order.map((k) =>
          tiers[k] > 0 ? (
            <div
              key={k}
              className={TIER_COLOR[k]}
              style={{ width: `${(tiers[k] / total) * 100}%` }}
              title={`${TIER_LABEL[k]}: ${tiers[k]}`}
            />
          ) : null
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dim">
        {order.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${TIER_COLOR[k]}`} />
            {TIER_LABEL[k]}: <span className="tnum font-semibold text-main">{tiers[k]}</span>/126
          </span>
        ))}
      </div>
    </div>
  );
}

function ConfusionCell({ label, value, tone }: { label: string; value: number; tone: "match" | "rule" | "model" | "neither" }) {
  const toneClass = {
    match: "border-accent-500/40 bg-accent-500/10",
    rule: "border-soft bg-elev-2",
    model: "border-soft bg-elev-2",
    neither: "border-soft bg-elev",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 text-center ${toneClass}`}>
      <div className="tnum text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}

function ScoreDistributionBar({ dist }: { dist: FloodSummary["score_distribution"] }) {
  const lo = 0, hi = 1;
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;
  return (
    <div className="mt-2">
      <div className="relative h-3 w-full rounded-full bg-elev-2">
        <div
          className="absolute h-3 rounded-full bg-accent-500/30"
          style={{ left: `${pct(dist.p10)}%`, width: `${pct(dist.p90) - pct(dist.p10)}%` }}
        />
        <div className="absolute h-3 w-0.5 bg-accent-500" style={{ left: `${pct(dist.median)}%` }} />
        <div className="absolute h-3 w-px bg-[#e5484d]" style={{ left: "50%" }} title="flag threshold 0.5" />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dim">
        <span>min <span className="tnum text-main">{dist.min.toFixed(3)}</span></span>
        <span>p10 <span className="tnum text-main">{dist.p10.toFixed(3)}</span></span>
        <span>median <span className="tnum text-main">{dist.median.toFixed(3)}</span></span>
        <span>p90 <span className="tnum text-main">{dist.p90.toFixed(3)}</span></span>
        <span>max <span className="tnum text-main">{dist.max.toFixed(3)}</span></span>
      </div>
    </div>
  );
}

function FeatureRow({ label, values }: { label: string; values: Record<string, number> }) {
  return (
    <tr className="border-b border-soft/50 last:border-0">
      <td className="px-3 py-2 text-dim">{label}</td>
      {Object.values(values).map((v, i) => (
        <td key={i} className="tnum px-3 py-2 text-main">{v.toFixed(3)}</td>
      ))}
    </tr>
  );
}

export default function ModelsInProductionPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [flood, setFlood] = useState<FloodSummary | null>(null);

  useEffect(() => {
    fetch(`${BASE}/data/track_g_dashboard_summary.json`).then((r) => r.json()).then(setData);
    fetch(`${BASE}/data/track_d_dashboard_summary.json`).then((r) => r.json()).then(setFlood);
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading real model-integration results...</p>;

  const fc = data.fire_classifier;
  const nModelFlag = fc["n_model_flagged_ge_0.5"] ?? fc.n_model_flagged_ge_0_5 ?? 0;
  const tiers = data.crop_share_model.tier_breakdown_126_districts;
  const gbAjk = data.crop_share_model.gb_ajk_model_attempt.districts;

  return (
    <div>
      <h1 className="text-xl font-semibold">Trained Models in Production</h1>
      <p className="mt-1 text-sm text-dim">
        Phase 3&apos;s two trained models (Track E&apos;s fire classifier, Track F&apos;s crop-share
        regressor) wired into the real pipeline &mdash; not just benchmarked in a report.
      </p>

      <h2 className="mt-8 text-base font-semibold">Crop-share model: national district coverage</h2>
      <p className="mt-1 text-sm text-dim">
        Every one of the 126 real districts now has a labeled source tier for its crop mix.
      </p>
      <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
        <TierBar tiers={tiers} />
      </div>

      <CaveatBanner>
        The trained model was tested on the 11 real Gilgit-Baltistan/Azad Kashmir districts
        real data doesn&apos;t cover &mdash; and rejected. Predictions clustered near the national
        average regardless of real terrain, and 3 districts predicted an impossible negative
        crop share. All 11 stay on the honest hand-classified fallback, not a model number that
        looked precise but wasn&apos;t trustworthy.
      </CaveatBanner>

      <div className="mt-4 overflow-x-auto rounded-xl border border-soft bg-elev">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-soft text-faint">
              <th className="px-3 py-2 font-medium">District</th>
              <th className="px-3 py-2 font-medium">Predicted wheat</th>
              <th className="px-3 py-2 font-medium">Predicted cotton</th>
              <th className="px-3 py-2 font-medium">Predicted rice</th>
              <th className="px-3 py-2 font-medium">Predicted sugarcane</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {gbAjk.map((d) => {
              const neg = Object.values(d.predicted_shares).some((v) => v < 0);
              return (
                <tr key={d.district} className="border-b border-soft/50 last:border-0">
                  <td className="px-3 py-2 text-main">{d.district}</td>
                  <td className="tnum px-3 py-2 text-dim">{d.predicted_shares.wheat.toFixed(3)}</td>
                  <td className="tnum px-3 py-2 text-dim">{d.predicted_shares.cotton.toFixed(3)}</td>
                  <td className="tnum px-3 py-2 text-dim">{d.predicted_shares.rice.toFixed(3)}</td>
                  <td className={`tnum px-3 py-2 ${neg ? "text-[#e5484d]" : "text-dim"}`}>
                    {d.predicted_shares.sugarcane.toFixed(3)}
                    {neg && " ⚠"}
                  </td>
                  <td className="px-3 py-2 text-faint">
                    rejected &mdash; using hand mask
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-base font-semibold">Fire classifier: real score alongside the rule</h2>
      <p className="mt-1 text-sm text-dim">
        {fc.real_window} &mdash; {fc.n_records_compared} real records where both the rule and the
        trained model produced a result.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ConfusionCell label="Both flag" value={fc.both_flagged} tone="match" />
        <ConfusionCell label="Rule only" value={fc.rule_only} tone="rule" />
        <ConfusionCell label="Model only (score ≥ 0.5)" value={fc.model_only} tone="model" />
        <ConfusionCell label="Neither" value={fc.neither} tone="neither" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-faint sm:grid-cols-3">
        <span>Rule flagged: <span className="tnum text-dim">{fc.n_rule_flagged}</span></span>
        <span>Model flagged (&ge;0.5): <span className="tnum text-dim">{nModelFlag}</span></span>
        <span>Mean model score: <span className="tnum text-dim">{fc.mean_model_score}</span></span>
      </div>

      <CaveatBanner>{fc.caveat}</CaveatBanner>

      <h2 className="mt-10 text-base font-semibold">Flood risk model: live national screen</h2>
      <p className="mt-1 text-sm text-dim">
        Unlike the fire classifier above (bound to a fixed Nov 2023 MSG archive), Track D&apos;s
        Sentinel-1/JRC inputs are live and continuously updating &mdash; this section reflects
        real current conditions as of generation time, not a replay of the 2022 training event.
      </p>

      {!flood ? (
        <p className="mt-4 text-sm text-dim">Loading live flood screen...</p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-[#e5484d]/40 bg-[#e5484d]/10 p-4 text-sm">
            <strong className="text-main">Not a flood alert.</strong>{" "}
            <span className="text-dim">
              This live run flagged {flood.n_districts_flagged_raw}/{flood.n_districts_total} districts
              at the raw {flood.flag_threshold} cutoff ({flood.during_window[0]} to {flood.during_window[1]}).
              That is not reported as real current flooding &mdash; see the finding below.
            </span>
          </div>

          <h3 className="mt-6 text-sm font-semibold text-main">Real finding: a generalization gap, not sampling bias</h3>
          <p className="mt-1 text-sm text-dim">{flood.domain_shift_finding.headline}</p>
          <p className="mt-2 text-sm text-dim">{flood.domain_shift_finding.explanation}</p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-soft bg-elev">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-soft text-faint">
                  <th className="px-3 py-2 font-medium"></th>
                  {Object.keys(flood.domain_shift_finding.training_flooded_class_centroid).map((k) => (
                    <th key={k} className="px-3 py-2 font-medium">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <FeatureRow label="2022 training: flooded class" values={flood.domain_shift_finding.training_flooded_class_centroid} />
                <FeatureRow label="2022 training: not-flooded class" values={flood.domain_shift_finding.training_not_flooded_class_centroid} />
                <FeatureRow label="Live 2026 national mean" values={flood.domain_shift_finding.live_2026_national_mean} />
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-faint">
            The live national average sits close to the &ldquo;flooded&rdquo; row, not the &ldquo;not-flooded&rdquo;
            row &mdash; the real reason this run over-flags.
          </p>

          <h3 className="mt-6 text-sm font-semibold text-main">Score distribution (not just the binary flag)</h3>
          <p className="mt-1 text-sm text-dim">
            Even though most districts cross the 0.5 cutoff, there is a real gradient underneath
            it &mdash; useful signal for a future recalibration pass, not reported as clean enough
            to trigger on today.
          </p>
          <ScoreDistributionBar dist={flood.score_distribution} />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-faint">Highest-scoring districts</div>
              <ul className="mt-2 space-y-1 text-xs text-dim">
                {flood.top5_by_score.map((d) => (
                  <li key={d.district} className="flex justify-between">
                    <span className="text-main">{d.district}</span>
                    <span className="tnum">{d.mean_model_score.toFixed(3)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium text-faint">
                Below the 0.5 threshold ({flood.districts_below_threshold.length}/126)
              </div>
              <ul className="mt-2 space-y-1 text-xs text-dim">
                {flood.districts_below_threshold.map((d) => (
                  <li key={d.district} className="flex justify-between">
                    <span className="text-main">{d.district}</span>
                    <span className="tnum">{d.mean_model_score.toFixed(3)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <CaveatBanner>{flood.not_merged_reason}</CaveatBanner>
          {flood.caveats.map((c, i) => (
            <CaveatBanner key={i}>{c}</CaveatBanner>
          ))}
        </>
      )}
    </div>
  );
}
