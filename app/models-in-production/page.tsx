"use client";

import { useEffect, useState } from "react";
import ModelCard from "../components/ModelCard";

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
  real_district_area: "Real government data",
  model_predicted: "Model's best guess",
  hand_classified_mask: "Manual estimate",
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

export default function ModelsInProductionPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [flood, setFlood] = useState<FloodSummary | null>(null);

  useEffect(() => {
    fetch(`${BASE}/data/track_g_dashboard_summary.json`).then((r) => r.json()).then(setData);
    fetch(`${BASE}/data/track_d_dashboard_summary.json`).then((r) => r.json()).then(setFlood);
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading...</p>;

  const fc = data.fire_classifier;
  const tiers = data.crop_share_model.tier_breakdown_126_districts;
  const gbAjk = data.crop_share_model.gb_ajk_model_attempt.districts;

  return (
    <div>
      <h1 className="text-xl font-semibold">AI Models</h1>
      <p className="mt-2 text-sm text-dim">
        This page shows the trained computer models used across the site, how accurate they
        are, and where they still fall short. Nothing here is hidden or rounded up.
      </p>

      <h2 className="mt-8 text-base font-semibold">Which crops grow where</h2>

      <ModelCard
        name="National Crop-Share Model"
        version="Trained on real satellite images and real government crop data"
        confidenceLabel="moderate"
        confidenceTone="moderate"
        trainedOn="Learns from how fields look in satellite images across a growing season, matched against real government crop records."
        comparison={[
          { label: "Wheat", value: 0.581 },
          { label: "Cotton", value: 0.507 },
          { label: "Rice", value: 0.420 },
          { label: "Sugarcane", value: -1.120, negative: true },
        ]}
      >
        Works well for wheat, cotton, and rice. Sugarcane&apos;s guess isn&apos;t reliable
        &mdash; shown honestly, not hidden.
      </ModelCard>

      <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
        <h3 className="mb-2 text-sm font-semibold">Where the data comes from, all 126 districts</h3>
        <TierBar tiers={tiers} />
      </div>

      <p className="mt-3 text-xs text-dim">
        For 11 mountain districts (Gilgit-Baltistan and Azad Kashmir), the model&apos;s guesses
        didn&apos;t make sense &mdash; some were even negative &mdash; so those districts use a
        manual estimate instead.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-soft bg-elev">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-soft text-faint">
              <th className="px-3 py-2 font-medium">District</th>
              <th className="px-3 py-2 font-medium">Wheat</th>
              <th className="px-3 py-2 font-medium">Cotton</th>
              <th className="px-3 py-2 font-medium">Rice</th>
              <th className="px-3 py-2 font-medium">Sugarcane</th>
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
                  <td className="px-3 py-2 text-faint">not used</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-base font-semibold">Crop-burning fires</h2>
      <p className="mt-2 text-sm text-dim">
        Compares a simple rule against a trained model for spotting crop-burning fires from
        satellite images.
      </p>

      <ModelCard
        name="Fire Detector"
        version="Trained on real satellite heat data, tested on a year it had never seen"
        confidenceLabel="moderate"
        confidenceTone="moderate"
        trainedOn="Looks at heat patterns in satellite images, without using location as a shortcut."
        comparison={[
          { label: "Trained model", value: 0.354 },
          { label: "Simple rule", value: 0.002, isBaseline: true },
        ]}
      >
        The trained model catches far more real fires than the simple rule does.
      </ModelCard>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ConfusionCell label="Both agree" value={fc.both_flagged} tone="match" />
        <ConfusionCell label="Rule only" value={fc.rule_only} tone="rule" />
        <ConfusionCell label="Model only" value={fc.model_only} tone="model" />
        <ConfusionCell label="Neither" value={fc.neither} tone="neither" />
      </div>

      <h2 className="mt-10 text-base font-semibold">Flood risk</h2>
      <p className="mt-2 text-sm text-dim">
        Unlike the fire model above, this one uses live satellite data that keeps updating, so
        it reflects current conditions, not a replay of an old event.
      </p>

      {!flood ? (
        <p className="mt-4 text-sm text-dim">Loading...</p>
      ) : (
        <>
          <ModelCard
            name="Flood Risk Model"
            version="Uses satellite radar, water maps, and real rainfall data"
            confidenceLabel="moderate"
            confidenceTone="moderate"
            trainedOn="Trained on a real flood event, tested on a different real flood year it had never seen."
            comparison={[
              { label: "Trained model", value: flood.real_fair_test_validation.v3_model_deployed.f1 },
              { label: "Simple rule", value: 0.143, isBaseline: true },
            ]}
          >
            Out of every 100 places flagged as flooded, about 19 really were &mdash; still far
            from perfect, but a real improvement over earlier attempts.
          </ModelCard>

          <p className="mt-4 text-sm text-dim">
            Right now: {flood.n_districts_flagged_raw} of {flood.n_districts_total} districts
            show a raised flood-risk signal.
          </p>
        </>
      )}
    </div>
  );
}
