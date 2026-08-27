"use client";

import { useEffect, useState } from "react";
import CaveatBanner from "../components/CaveatBanner";
import TechNote from "../components/TechNote";
import DisclaimerBar from "../components/DisclaimerBar";
import ModelCard from "../components/ModelCard";
import ProvenanceLine from "../components/ProvenanceLine";

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
  model_version: string;
  status: string;
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
  caveats: string[];
  wired_into_trigger_engine: boolean;
  trigger_engine_effect: string;
}

const TIER_LABEL: Record<string, string> = {
  real_district_area: "Real MNFSR district data",
  model_predicted: "Model-predicted",
  hand_classified_mask: "Hand-classified mask (fallback)",
};
const TIER_COLOR: Record<string, string> = {
  real_district_area: "bg-accent-500",
  model_predicted: "bg-secondary-500",
  hand_classified_mask: "bg-[#8c8878]",
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
        <div className="absolute h-3 w-px bg-critical" style={{ left: "50%" }} title="flag threshold 0.5" />
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
        Two trained models &mdash; a fire classifier and a national crop-share regressor
        &mdash; wired into the real pipeline &mdash; not just benchmarked in a report.
      </p>
      <TechNote>Internally &ldquo;Track E&rdquo; (fire classifier) and &ldquo;Track F&rdquo; (crop-share regressor), Phase 3.</TechNote>

      <DisclaimerBar>
        Every score on this page comes from a trained model applied to real satellite
        inputs &mdash; none of it is a certified government measurement. Where a model was
        tested and rejected (GB/AJK crop shares below), that rejection is reported here too,
        not hidden.
      </DisclaimerBar>

      <h2 className="mt-8 text-base font-semibold">Crop-share model: national district coverage</h2>
      <p className="mt-1 text-sm text-dim">
        Every one of the 126 real districts now has a labeled source tier for its crop mix.
      </p>

      <ModelCard
        name="National Crop-Share Model"
        version="GBT, district-level, held-out test"
        confidenceLabel="moderate"
        confidenceTone="moderate"
        trainedOn="Trained on real Sentinel-2 NDVI/NDWI/EVI phenology features against real MNFSR district crop-area labels (2,875 cropland points, 115/126 districts, spatially-blocked 81/17/17 split). No latitude/longitude or district-identity feature, by construction."
        comparison={[
          { label: "Wheat R²", value: 0.581 },
          { label: "Cotton R²", value: 0.507 },
          { label: "Rice R²", value: 0.420 },
          { label: "Sugarcane R²", value: -1.120, negative: true },
        ]}
      >
        All four clearly beat a constant-baseline except sugarcane, a real reported failure
        (small national share, thin weak-label signal) &mdash; shown at true scale, not folded
        into an average with the others.
      </ModelCard>

      <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
        <TierBar tiers={tiers} />
        <ProvenanceLine source="real_crop_mix.json + track_g_dashboard_summary.json" updated="Week 20 integration" />
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
                  <td className={`tnum px-3 py-2 ${neg ? "text-critical" : "text-dim"}`}>
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

      <ModelCard
        name="Residue-Burning Fire Classifier"
        version="Thermal-only GBT, 2021 held-out generalization test"
        confidenceLabel="moderate"
        confidenceTone="moderate"
        trainedOn="Trained on real MSG thermal-band grid cells (183,150 rows, national bbox) labeled against real NASA FIRMS hotspots. Deliberately excludes lat/lon after an earlier with-geo version scored higher only by memorizing location, not learning thermal signal."
        comparison={[
          { label: "Model F1 (2021 unseen year)", value: 0.354 },
          { label: "Rule-based F1 (same data)", value: 0.002, isBaseline: true },
        ]}
      >
        Recall rose from 0.587 (2023 test) to 0.763 on an entirely unseen 2021 archive with
        essentially unchanged F1 &mdash; real evidence the original result wasn&apos;t a one-off.
      </ModelCard>

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
      <ProvenanceLine source="track_g_dashboard_summary.json (fire_classifier)" updated="Week 19 cross-year validation" />

      <h2 className="mt-10 text-base font-semibold">Flood risk model: live national screen</h2>
      <p className="mt-1 text-sm text-dim">
        Unlike the fire classifier above (bound to a fixed Nov 2023 MSG archive), this
        model&apos;s Sentinel-1/JRC inputs are live and continuously updating &mdash; this
        section reflects real current conditions as of generation time, not a replay of
        the 2022 training event.
      </p>
      <TechNote>Internally &ldquo;Track D&rdquo; (flood classifier).</TechNote>

      {!flood ? (
        <p className="mt-4 text-sm text-dim">Loading live flood screen...</p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-accent-500/40 bg-accent-soft p-4 text-sm">
            <strong className="text-main">Promoted &amp; wired into the trigger engine (Week 27).</strong>{" "}
            <span className="text-dim">
              This live run flagged {flood.n_districts_flagged_raw}/{flood.n_districts_total} districts
              at the raw {flood.flag_threshold} cutoff ({flood.during_window[0]} to {flood.during_window[1]}).
              {" "}{flood.trigger_engine_effect}
            </span>
          </div>

          <ModelCard
            name="Flood Risk Screen"
            version="v3: Sentinel-1 SAR + JRC + real CHIRPS precipitation, GBT classifier"
            confidenceLabel="moderate (fair-test validated)"
            confidenceTone="moderate"
            trainedOn="Trained on real Sentinel-1 VV/VH change + JRC water-occurrence + real CHIRPS precipitation (total + 20-year anomaly) against IOM/Shelter Cluster's independently-sourced 2022 calamity-declared districts (96/126 matched) &mdash; not the same satellite-derived map used as model input, avoiding label circularity."
            comparison={[
              { label: "F1 (fair 2024 held-out test)", value: flood.real_fair_test_validation.v3_model_deployed.f1 },
              { label: "Rule-based F1 (same data)", value: 0.143, isBaseline: true },
            ]}
          >
            A 2021-negative-year retrain (v2) was evaluated and explicitly rejected: it scored
            worse on every metric against a fair 2024 test (AUC 0.519, barely above random) and
            was found to output a near-constant score regardless of true label. Adding real
            precipitation (v3) instead, validated on the same fair test, is the deployed candidate.
          </ModelCard>

          <h3 className="mt-6 text-sm font-semibold text-main">Real fair-test validation (2024, unseen year)</h3>
          <p className="mt-1 text-sm text-dim">{flood.real_fair_test_validation.note}</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-soft bg-elev">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="border-b border-soft text-faint">
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 font-medium">Precision</th>
                  <th className="px-3 py-2 font-medium">Recall</th>
                  <th className="px-3 py-2 font-medium">F1</th>
                  <th className="px-3 py-2 font-medium">AUC</th>
                  <th className="px-3 py-2 font-medium">Score-separation gap</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-soft/50 text-dim">
                  <td className="px-3 py-2">Original (SAR/JRC only)</td>
                  <td className="tnum px-3 py-2">{flood.real_fair_test_validation.original_model.precision.toFixed(3)}</td>
                  <td className="tnum px-3 py-2">{flood.real_fair_test_validation.original_model.recall.toFixed(3)}</td>
                  <td className="tnum px-3 py-2">{flood.real_fair_test_validation.original_model.f1.toFixed(3)}</td>
                  <td className="tnum px-3 py-2">{flood.real_fair_test_validation.original_model.roc_auc?.toFixed(3)}</td>
                  <td className="tnum px-3 py-2">{flood.real_fair_test_validation.score_separation_diagnostic.original.separation_gap.toFixed(3)}</td>
                </tr>
                <tr className="border-b border-soft/50 text-faint">
                  <td className="px-3 py-2">v2 (rejected &mdash; collapsed)</td>
                  <td className="tnum px-3 py-2">{flood.real_fair_test_validation.v2_model_rejected.precision.toFixed(3)}</td>
                  <td className="tnum px-3 py-2">{flood.real_fair_test_validation.v2_model_rejected.recall.toFixed(3)}</td>
                  <td className="tnum px-3 py-2">{flood.real_fair_test_validation.v2_model_rejected.f1.toFixed(3)}</td>
                  <td className="tnum px-3 py-2">{flood.real_fair_test_validation.v2_model_rejected.roc_auc?.toFixed(3)}</td>
                  <td className="tnum px-3 py-2">{flood.real_fair_test_validation.score_separation_diagnostic.v2.separation_gap.toFixed(3)}</td>
                </tr>
                <tr className="text-main">
                  <td className="px-3 py-2 font-semibold">v3 (precip-augmented, deployed)</td>
                  <td className="tnum px-3 py-2 font-semibold text-accent-500">{flood.real_fair_test_validation.v3_model_deployed.precision.toFixed(3)}</td>
                  <td className="tnum px-3 py-2 font-semibold text-accent-500">{flood.real_fair_test_validation.v3_model_deployed.recall.toFixed(3)}</td>
                  <td className="tnum px-3 py-2 font-semibold text-accent-500">{flood.real_fair_test_validation.v3_model_deployed.f1.toFixed(3)}</td>
                  <td className="tnum px-3 py-2 font-semibold text-accent-500">{flood.real_fair_test_validation.v3_model_deployed.roc_auc?.toFixed(3)}</td>
                  <td className="tnum px-3 py-2 font-semibold text-accent-500">{flood.real_fair_test_validation.score_separation_diagnostic.v3_precip.separation_gap.toFixed(3)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-faint">
            Real precision (0.190) still means most &ldquo;flooded&rdquo; predictions are wrong
            even on this best-so-far evaluation &mdash; read as a meaningfully-improved relative
            risk ranking, not a calibrated probability.
          </p>

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

          {flood.caveats.map((c, i) => (
            <CaveatBanner key={i}>{c}</CaveatBanner>
          ))}
          <ProvenanceLine source="track_d_dashboard_summary.json" updated={`live screen, ${flood.during_window[1]}`} />
        </>
      )}
    </div>
  );
}
