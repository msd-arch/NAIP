"use client";

import { useEffect, useState } from "react";
import { R2Bar, AccuracyBar, YieldBar } from "../components/ChartBars";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface ModelResult {
  held_out_test_accuracy: number;
  held_out_test_precision_irrigated: number;
  held_out_test_recall_irrigated: number;
  held_out_test_f1_irrigated: number;
  cv_5fold_accuracy_mean: number;
  cv_5fold_accuracy_std: number;
}

interface Report {
  task: string; scope_note: string;
  n_farms_total: number; n_farms_used: number;
  class_balance: { irrigated: number; not_irrigated: number };
  majority_class_baseline_accuracy: number;
  features: string; labels: string; train_test_split: string;
  models: Record<string, ModelResult>;
}

interface DirectionResult {
  n_train_districts: number; n_test_districts: number;
  district_level: Record<string, { mae: number; r2: number }>;
}
interface CrossYearResults {
  direction_A_train2122_test2223: DirectionResult;
  direction_B_train2223_test2122: DirectionResult;
  original_week8_within_year_district_level: Record<string, { mae: number; r2: number }>;
}

interface InterimDistrict {
  tier: string; season: string;
  predicted_shares: { wheat: number; cotton: number; rice: number; sugarcane: number };
  flagged_negative_share: boolean;
}

interface YieldEvalBlock { n: number; mae: number; r2: number | null }
interface YieldDirection {
  skipped?: boolean;
  district_level?: YieldEvalBlock;
  feature_importance_top5?: Record<string, number>;
}
interface YieldCropResult {
  n_real_yield_cells_2022_23: number; n_real_yield_cells_2021_22: number;
  direction_A_train2122_test2223: YieldDirection;
  direction_B_train2223_test2122: YieldDirection;
  naive_baseline_A_predict2223_from2122: YieldEvalBlock & { skipped?: boolean; n_districts?: number };
  naive_baseline_B_predict2122_from2223: YieldEvalBlock & { skipped?: boolean; n_districts?: number };
}
interface YieldResults {
  features_used: string[];
  crops: Record<string, YieldCropResult>;
  real_hazard_ablation: { attempted: boolean; reason: string };
}

interface CropR2 { mae: number; r2: number }
interface TrackFResults {
  n_train_districts: number; n_val_districts: number; n_test_districts: number;
  n_train_points: number; n_val_points: number; n_test_points: number;
  note_on_no_geo_features: string;
  gbt_test_district_level: {
    wheat: CropR2; cotton: CropR2; rice: CropR2; sugarcane: CropR2; overall_mae: number;
  };
}

const CROPS = ["wheat", "cotton", "rice", "sugarcane"] as const;

export default function CropClassifierPage() {
  const [data, setData] = useState<Report | null>(null);
  const [trackF, setTrackF] = useState<TrackFResults | null>(null);
  const [crossYear, setCrossYear] = useState<CrossYearResults | null>(null);
  const [interim, setInterim] = useState<Record<string, InterimDistrict> | null>(null);
  const [yieldResults, setYieldResults] = useState<YieldResults | null>(null);

  useEffect(() => {
    fetch(`${BASE}/data/crop_classifier_report.json`).then((r) => r.json()).then(setData);
    fetch(`${BASE}/data/track_f_results.json`).then((r) => r.json()).then(setTrackF);
    fetch(`${BASE}/data/track_j_crossyear_results.json`).then((r) => r.json()).then(setCrossYear);
    fetch(`${BASE}/data/real_crop_mix_interim_estimates.json`).then((r) => r.json()).then(setInterim);
    fetch(`${BASE}/data/track_o_yield_results.json`).then((r) => r.json()).then(setYieldResults);
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading...</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold">Crop Intelligence</h1>
      <p className="mt-2 text-sm text-dim">
        These tools use satellite images to guess things about crops &mdash; which farms are
        irrigated, what crop is growing where, and how much each district is likely to harvest.
      </p>

      <h2 id="irrigation-classifier" className="mt-6 scroll-mt-20 text-base font-semibold">Is this farm irrigated?</h2>
      <p className="mt-2 text-sm text-dim">
        We guess whether a farm is irrigated by how green it looks in satellite images over
        the season.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
        <Stat label="Farms checked" value={`${data.n_farms_used}/${data.n_farms_total}`} />
        <Stat label="Irrigated" value={`${data.class_balance.irrigated}`} />
        <Stat label="Not irrigated" value={`${data.class_balance.not_irrigated}`} />
        <Stat label="Baseline (always guess 'no')" value={`${(data.majority_class_baseline_accuracy * 100).toFixed(1)}%`} />
      </div>

      <div className="mt-6 rounded-xl border border-soft bg-elev p-4">
        <h2 className="mb-3 text-sm font-semibold">How accurate is the guess?</h2>
        <p className="mb-4 text-xs text-faint">
          The white line is what you&apos;d get by always guessing &ldquo;not irrigated.&rdquo;
          Our models land a little below that line &mdash; shown honestly, not rounded up.
        </p>
        {Object.entries(data.models).map(([name, m]) => (
          <div key={name} className="mb-4">
            <div className="mb-1 text-xs font-medium capitalize text-main">{name.replace("_", " ")}</div>
            <AccuracyBar
              label="Accuracy"
              value={m.held_out_test_accuracy}
              baseline={data.majority_class_baseline_accuracy}
            />
          </div>
        ))}
      </div>

      <hr className="mt-10 border-soft" />

      <h2 id="crop-model" className="mt-8 scroll-mt-20 text-base font-semibold">
        What crops grow where?
      </h2>
      <p className="mt-2 text-sm text-dim">
        This estimates how much of each district&apos;s farmland grows wheat, cotton, rice, or
        sugarcane, based on satellite images.
      </p>

      {!trackF ? (
        <p className="mt-4 text-sm text-dim">Loading...</p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
            <h3 className="mb-3 text-sm font-semibold">How accurate, per crop</h3>
            <p className="mb-4 text-xs text-faint">
              Higher is better. Sugarcane&apos;s guess isn&apos;t reliable &mdash; shown as-is,
              not hidden.
            </p>
            {CROPS.map((crop) => (
              <R2Bar key={crop} crop={crop} r2={trackF.gbt_test_district_level[crop].r2} />
            ))}
          </div>
        </>
      )}

      <hr className="mt-10 border-soft" />

      <h2 id="cross-year-validation" className="mt-8 scroll-mt-20 text-base font-semibold">
        Does it still work in a different year?
      </h2>
      <p className="mt-2 text-sm text-dim">
        We trained on one year&apos;s real data and tested on another, to see if the model
        still works on a year it hasn&apos;t seen before.
      </p>

      {!crossYear ? (
        <p className="mt-4 text-sm text-dim">Loading...</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-soft">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="border-b border-soft text-faint">
                <th className="px-3 py-2 font-medium">Crop</th>
                <th className="px-3 py-2 font-medium">Same year</th>
                <th className="px-3 py-2 font-medium">Different year (A)</th>
                <th className="px-3 py-2 font-medium">Different year (B)</th>
              </tr>
            </thead>
            <tbody>
              {CROPS.map((crop) => {
                const orig = crossYear.original_week8_within_year_district_level[crop].r2;
                const a = crossYear.direction_A_train2122_test2223.district_level[crop].r2;
                const b = crossYear.direction_B_train2223_test2122.district_level[crop].r2;
                const improved = crop === "sugarcane" && a > orig && b > orig;
                return (
                  <tr key={crop} className="border-b border-soft/50 last:border-0">
                    <td className="px-3 py-2 capitalize text-main">{crop}</td>
                    <td className="tnum px-3 py-2 text-dim">{orig.toFixed(3)}</td>
                    <td className={`tnum px-3 py-2 ${improved ? "text-accent-500" : "text-dim"}`}>{a.toFixed(3)}</td>
                    <td className={`tnum px-3 py-2 ${improved ? "text-accent-500" : "text-dim"}`}>{b.toFixed(3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <hr className="mt-10 border-soft" />

      <h2 className="mt-8 text-base font-semibold">
        Filling the gap for recent years
      </h2>
      <p className="mt-2 text-sm text-dim">
        Official government crop records only go up to 2023. For anything more recent, we use
        the trained model&apos;s own best guess instead &mdash; a real estimate, not an
        official record.
      </p>

      {!interim ? (
        <p className="mt-4 text-sm text-dim">Loading...</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-3">
          <Stat label="Districts estimated" value={`${Object.keys(interim).length}`} />
          <Stat label="Season" value={Object.values(interim)[0]?.season ?? "n/a"} />
          <Stat
            label="Flagged as odd"
            value={`${Object.values(interim).filter((d) => d.flagged_negative_share).length}`}
          />
        </div>
      )}

      <hr className="mt-10 border-soft" />

      <h2 id="yield-prediction" className="mt-8 scroll-mt-20 text-base font-semibold">
        How much will each district harvest?
      </h2>
      <p className="mt-2 text-sm text-dim">
        We tried predicting how much each district would harvest per hectare. Surprisingly,
        simply assuming &ldquo;this year will match last year&rdquo; usually beats our model
        &mdash; a real, honest finding, not something we&apos;re hiding.
      </p>

      {!yieldResults ? (
        <p className="mt-4 text-sm text-dim">Loading...</p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
            <h3 className="mb-1 text-sm font-semibold">Model vs. simple guess</h3>
            <p className="mb-3 text-xs text-faint">
              Where the gray bar reaches further than the green bar, the simple guess really
              does win.
            </p>
            {CROPS.flatMap((crop) => {
              const c = yieldResults.crops[crop];
              if (!c) return [];
              const rows = [
                { label: "A", model: c.direction_A_train2122_test2223, naive: c.naive_baseline_A_predict2223_from2122 },
                { label: "B", model: c.direction_B_train2223_test2122, naive: c.naive_baseline_B_predict2122_from2223 },
              ];
              return rows.map(({ label, model, naive }) => {
                const modelR2 = model.district_level?.r2 ?? null;
                const naiveR2 = naive.skipped ? null : naive.r2;
                if (modelR2 == null && naiveR2 == null) return [];
                return (
                  <YieldBar key={`${crop}-${label}`} label={`${crop} (${label})`} modelR2={modelR2} naiveR2={naiveR2} />
                );
              });
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-soft bg-elev p-3">
      <div className="tnum text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}
