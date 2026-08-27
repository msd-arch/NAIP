"use client";

import { useEffect, useState } from "react";
import CaveatBanner from "../components/CaveatBanner";
import TechNote from "../components/TechNote";
import ProvenanceLine from "../components/ProvenanceLine";
import DisclaimerBar from "../components/DisclaimerBar";

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

function R2Bar({ crop, r2 }: { crop: string; r2: number }) {
  // R2 can go negative (a real, reported failure for sugarcane) -- scale around 0,
  // not just [0,1], so a negative bar is visibly distinct, not clipped to zero.
  const clamped = Math.max(-1.5, Math.min(1, r2));
  const negative = clamped < 0;
  const widthPct = (Math.abs(clamped) / 1.5) * 50;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="capitalize text-dim">{crop}</span>
        <span className={`tnum font-semibold ${negative ? "text-critical" : "text-main"}`}>
          R² = {r2.toFixed(3)} {negative && "(real, reported failure)"}
        </span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-elev-2">
        <div className="absolute left-1/2 top-0 h-full w-px bg-[var(--text)] opacity-40" />
        <div
          className={`absolute top-0 h-full rounded-full ${negative ? "bg-critical/70" : "bg-accent-500"}`}
          style={negative ? { right: "50%", width: `${widthPct}%` } : { left: "50%", width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

function AccuracyBar({ label, value, baseline }: { label: string; value: number; baseline: number }) {
  const max = Math.max(value, baseline) * 1.15;
  const belowBaseline = value < baseline;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-dim">{label}</span>
        <span className="tnum font-semibold text-main">
          {(value * 100).toFixed(1)}% {belowBaseline && <span className="text-faint">(below baseline)</span>}
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-elev-2">
        <div
          className={`h-full rounded-full ${belowBaseline ? "bg-[#8c8878]" : "bg-accent-500"}`}
          style={{ width: `${(value / max) * 100}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-[var(--text)] opacity-60"
          style={{ left: `${(baseline / max) * 100}%` }}
          title={`majority-class baseline: ${(baseline * 100).toFixed(1)}%`}
        />
      </div>
    </div>
  );
}

function YieldBar({ label, modelR2, naiveR2 }: { label: string; modelR2: number | null; naiveR2: number | null }) {
  const vals = [modelR2, naiveR2].filter((v): v is number => v != null);
  const maxAbs = Math.max(0.2, ...vals.map((v) => Math.abs(v)));
  const bar = (v: number | null, isBaseline: boolean) => {
    if (v == null) return <div className="h-2 w-full rounded-full bg-elev-2" />;
    const neg = v < 0;
    const widthPct = (Math.abs(v) / maxAbs) * 100;
    return (
      <div className="h-2 w-full rounded-full bg-elev-2">
        <div
          className={`h-full rounded-full ${isBaseline ? "bg-[#8c8878]" : neg ? "bg-critical/70" : "bg-accent-500"}`}
          style={{ width: `${Math.max(2, widthPct)}%` }}
        />
      </div>
    );
  };
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="capitalize text-dim">{label}</span>
        <span className="tnum text-faint">
          model {modelR2 != null ? modelR2.toFixed(3) : "—"} vs. naive {naiveR2 != null ? naiveR2.toFixed(3) : "—"}
        </span>
      </div>
      <div className="space-y-1">
        {bar(modelR2, false)}
        {bar(naiveR2, true)}
      </div>
    </div>
  );
}

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

  if (!data) return <p className="text-sm text-dim">Loading real classifier results...</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold">Crop Intelligence</h1>
      <p className="mt-1 text-sm text-dim">
        Two real, separately-scoped classifiers: a pilot-region irrigation
        classifier below, and a national per-crop area-share regressor
        further down &mdash; different farms, different districts, different real
        ground truth, not one superseding the other.
      </p>

      <DisclaimerBar>
        Every model on this page is reported against its own real baseline, with sample
        size and coverage limits stated plainly &mdash; including two negative results
        (irrigation accuracy below its majority-class baseline; sugarcane yield/crop-share
        R&sup2; both negative) that are not smoothed over.
      </DisclaimerBar>

      <h2 id="irrigation-classifier" className="mt-6 scroll-mt-20 text-base font-semibold">Irrigation classifier (120-farm pilot)</h2>
      <p className="mt-1 text-sm text-dim">{data.task}</p>

      <CaveatBanner>{data.scope_note}</CaveatBanner>

      <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
        <Stat label="Farms used" value={`${data.n_farms_used}/${data.n_farms_total}`} />
        <Stat label="Irrigated" value={`${data.class_balance.irrigated}`} />
        <Stat label="Not irrigated" value={`${data.class_balance.not_irrigated}`} />
        <Stat label="Majority baseline" value={`${(data.majority_class_baseline_accuracy * 100).toFixed(1)}%`} />
      </div>

      <div className="mt-6 rounded-xl border border-soft bg-elev p-4">
        <h2 className="mb-3 text-sm font-semibold">
          Held-out test accuracy vs. majority-class baseline
        </h2>
        <p className="mb-4 text-xs text-faint">
          White tick = the {(data.majority_class_baseline_accuracy * 100).toFixed(1)}% baseline
          (always guessing &quot;not irrigated&quot;). Gray bars sit <strong>below</strong> it &mdash;
          shown honestly, not rounded up.
        </p>
        {Object.entries(data.models).map(([name, m]) => (
          <div key={name} className="mb-4">
            <div className="mb-1 text-xs font-medium capitalize text-main">{name.replace("_", " ")}</div>
            <AccuracyBar
              label="Held-out test accuracy"
              value={m.held_out_test_accuracy}
              baseline={data.majority_class_baseline_accuracy}
            />
            <div className="grid grid-cols-3 gap-2 text-[11px] text-dim">
              <span>Precision (irrigated): {m.held_out_test_precision_irrigated.toFixed(3)}</span>
              <span>Recall (irrigated): {m.held_out_test_recall_irrigated.toFixed(3)}</span>
              <span>5-fold CV: {m.cv_5fold_accuracy_mean.toFixed(3)} &plusmn; {m.cv_5fold_accuracy_std.toFixed(3)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-faint sm:grid-cols-3">
        <span>Features: {data.features}</span>
        <span>Labels: {data.labels}</span>
        <span>Split: {data.train_test_split}</span>
      </div>

      <hr className="mt-10 border-soft" />

      <h2 id="crop-model" className="mt-8 scroll-mt-20 text-base font-semibold">
        National crop-share model (115-district scope)
      </h2>
      <p className="mt-1 text-sm text-dim">
        Predicts real per-crop area SHARES (wheat/cotton/rice/sugarcane), not a single
        dominant crop &mdash; a literal &ldquo;classifier&rdquo; framing was checked
        first and found degenerate (wheat dominant in 93% of real districts).
      </p>
      <TechNote>Internally &ldquo;Track F.&rdquo;</TechNote>

      {!trackF ? (
        <p className="mt-4 text-sm text-dim">Loading real Track F results...</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-3">
            <Stat label="Train districts" value={`${trackF.n_train_districts}`} />
            <Stat label="Test districts" value={`${trackF.n_test_districts}`} />
            <Stat label="Test points" value={`${trackF.n_test_points}`} />
          </div>

          <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
            <h3 className="mb-3 text-sm font-semibold">
              Real R&sup2; per crop (GBT, district-level, held-out test districts)
            </h3>
            <p className="mb-4 text-xs text-faint">
              Bars split at zero &mdash; sugarcane&apos;s negative R&sup2; is shown at
              real scale, not clipped or folded into an average with the others.
            </p>
            {CROPS.map((crop) => (
              <R2Bar key={crop} crop={crop} r2={trackF.gbt_test_district_level[crop].r2} />
            ))}
            <ProvenanceLine source="track_f_results.json" updated="Week 8, district-level held-out test" />
          </div>

          <CaveatBanner>
            Sugarcane R&sup2; = {trackF.gbt_test_district_level.sugarcane.r2.toFixed(3)} &mdash; a
            real, reported failure, not hidden: the crop&apos;s small real national
            share and thin weak-label signal weren&apos;t enough to learn from at this
            sample size. Wheat/cotton/rice (R&sup2; = {trackF.gbt_test_district_level.wheat.r2.toFixed(3)}/
            {trackF.gbt_test_district_level.cotton.r2.toFixed(3)}/
            {trackF.gbt_test_district_level.rice.r2.toFixed(3)}) all clearly beat a
            constant-baseline. {trackF.note_on_no_geo_features}
          </CaveatBanner>
        </>
      )}

      <hr className="mt-10 border-soft" />

      <h2 id="cross-year-validation" className="mt-8 scroll-mt-20 text-base font-semibold">
        Genuine cross-year validation &mdash; a real, harder test
      </h2>
      <TechNote>Internally &ldquo;Track J.&rdquo;</TechNote>
      <p className="mt-1 text-sm text-dim">
        Train on one real MNFSR year, test on the other &mdash; both directions reported,
        not just whichever looks better. Real 2021-22 labels sourced from the same
        cap_2022_23.txt document&apos;s own embedded prior-year column (cross-validated
        exactly against the standalone 2021-22 report before trusting it).
      </p>

      {!crossYear ? (
        <p className="mt-4 text-sm text-dim">Loading real cross-year results...</p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-soft">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-soft text-faint">
                  <th className="px-3 py-2 font-medium">Crop</th>
                  <th className="px-3 py-2 font-medium">Original (within-year)</th>
                  <th className="px-3 py-2 font-medium">A: train 21-22 &rarr; test 22-23</th>
                  <th className="px-3 py-2 font-medium">B: train 22-23 &rarr; test 21-22</th>
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
          <CaveatBanner>
            Wheat/cotton/rice show a real, expected degradation under a genuine cross-year
            test (harder than the original spatial-only split). Sugarcane is the real
            exception &mdash; both cross-year directions score positive R&sup2;
            ({crossYear.direction_A_train2122_test2223.district_level.sugarcane.r2.toFixed(3)}/
            {crossYear.direction_B_train2223_test2122.district_level.sugarcane.r2.toFixed(3)}),
            beating the original&apos;s catastrophic -1.120. Most likely explanation: each
            cross-year direction trains on all 115 districts (vs. the original&apos;s 81-district
            spatial split), and a rare, thin-signal crop like sugarcane benefits disproportionately
            from more real training data &mdash; not claimed as a validated improvement, just the
            most likely real cause. No lat/lon or district-identity feature in either direction;
            permutation importance in both directions is led by real phenology metrics
            (evi_annual_mean, ndwi_peak_value), not a district-identity back door.
          </CaveatBanner>
        </>
      )}

      <hr className="mt-10 border-soft" />

      <h2 className="mt-8 text-base font-semibold">
        model_estimated_interim tier &mdash; bridging the gap since MNFSR&apos;s last real report
      </h2>
      <p className="mt-1 text-sm text-dim">
        The deployed national crop-share model (trained on real 2022-23 labels, unchanged) applied to real
        Sentinel-2 features for 2024-25 &mdash; the most recent complete real season since
        MNFSR&apos;s last real report. A model estimate, not real government data.
      </p>

      {!interim ? (
        <p className="mt-4 text-sm text-dim">Loading real interim estimates...</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-3">
            <Stat label="Districts estimated" value={`${Object.keys(interim).length}`} />
            <Stat label="Season" value={Object.values(interim)[0]?.season ?? "n/a"} />
            <Stat
              label="Flagged (negative share)"
              value={`${Object.values(interim).filter((d) => d.flagged_negative_share).length}`}
            />
          </div>
          <CaveatBanner>
            This tier never overrides real MNFSR data anywhere it exists (see each district&apos;s
            real authoritative tier in <code>real_crop_mix.json</code>) and is unvalidatable
            until a real MNFSR report covering 2023-24/2024-25 eventually arrives to check it
            against &mdash; a real, structural limitation of this tier, not a flaw to fix now.
            Not wired into <code>exposure_risk.py</code> this track &mdash; a separate, deliberate
            decision, not bundled in automatically. A handful of districts (near-zero true share)
            predicted a small negative share &mdash; flagged and kept as-is, not silently clamped.
          </CaveatBanner>
        </>
      )}

      <hr className="mt-10 border-soft" />

      <h2 id="yield-prediction" className="mt-8 scroll-mt-20 text-base font-semibold">
        Real yield prediction &mdash; a real, mostly negative result
      </h2>
      <p className="mt-1 text-sm text-dim">
        Predicts real yield (production &divide; area, tons/hectare) per district/crop from the
        same real Sentinel-2 phenology features the crop-share model uses &mdash; a new target, extending the
        same real infrastructure. Production figures were already sitting in the parsed MNFSR
        data unused; a real gap was found and closed (production had never been independently
        cross-validated against its own printed total, only area had) before any model was built.
      </p>
      <TechNote>Internally &ldquo;Track O.&rdquo;</TechNote>

      {!yieldResults ? (
        <p className="mt-4 text-sm text-dim">Loading real yield results...</p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
            <h3 className="mb-1 text-sm font-semibold">Naive baseline vs. trained model, real R&sup2; per crop</h3>
            <p className="mb-3 text-xs text-faint">
              Both cross-year directions shown, un-rounded &mdash; where the gray naive-baseline
              bar reaches further than the green model bar, the simple baseline really does win.
              Nothing here is framed to make the negative results look better than they are.
            </p>
            {CROPS.flatMap((crop) => {
              const c = yieldResults.crops[crop];
              if (!c) return [];
              const rows = [
                { label: "A: 21-22→22-23", model: c.direction_A_train2122_test2223, naive: c.naive_baseline_A_predict2223_from2122 },
                { label: "B: 22-23→21-22", model: c.direction_B_train2223_test2122, naive: c.naive_baseline_B_predict2122_from2223 },
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
            <ProvenanceLine source="track_o_yield_results.json" updated="Week 22" />
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-soft">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-soft text-faint">
                  <th className="px-3 py-2 font-medium">Crop</th>
                  <th className="px-3 py-2 font-medium">Direction</th>
                  <th className="px-3 py-2 font-medium">Model R&sup2;</th>
                  <th className="px-3 py-2 font-medium">Naive baseline R&sup2;</th>
                  <th className="px-3 py-2 font-medium">Winner</th>
                </tr>
              </thead>
              <tbody>
                {CROPS.flatMap((crop) => {
                  const c = yieldResults.crops[crop];
                  if (!c) return [];
                  const rows = [
                    { label: "A: train 21-22 → test 22-23", model: c.direction_A_train2122_test2223, naive: c.naive_baseline_A_predict2223_from2122 },
                    { label: "B: train 22-23 → test 21-22", model: c.direction_B_train2223_test2122, naive: c.naive_baseline_B_predict2122_from2223 },
                  ];
                  return rows.map(({ label, model, naive }) => {
                    const modelR2 = model.district_level?.r2 ?? null;
                    const naiveR2 = naive.skipped ? null : naive.r2;
                    const naiveWins = modelR2 != null && naiveR2 != null && naiveR2 > modelR2;
                    return (
                      <tr key={`${crop}-${label}`} className="border-b border-soft/50 last:border-0">
                        <td className="px-3 py-2 capitalize text-main">{crop}</td>
                        <td className="px-3 py-2 text-dim">{label}</td>
                        <td className="tnum px-3 py-2 text-dim">{modelR2 != null ? modelR2.toFixed(3) : "—"}</td>
                        <td className="tnum px-3 py-2 text-dim">{naiveR2 != null ? naiveR2.toFixed(3) : "—"}</td>
                        <td className={`px-3 py-2 font-medium ${naiveWins ? "text-warn" : "text-accent-500"}`}>
                          {naiveWins ? "naive baseline" : "model"}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>

          <CaveatBanner>
            <strong>Real, mostly negative result, reported plainly</strong>: a simple naive
            baseline (&ldquo;this district&apos;s yield this year = its real reported yield the
            other real year&rdquo;) beats the trained Sentinel-2 phenology model for wheat,
            cotton, and sugarcane in both cross-year directions, and for rice in one of two. Real
            wheat district-level yield is highly persistent year-over-year in this data (naive
            R&sup2; &asymp; 0.77) &mdash; a genuinely hard bar for satellite phenology from a
            <em> different</em> year to clear. Permutation importance confirms the model is
            learning real phenology signal where it works at all (top features: evi_annual_mean,
            ndwi_peak_value, ndvi_green_up_slope &mdash; no lat/lon or district-identity feature
            exists in the feature set at all, by construction). Real hazard co-occurrence
            (heat/drought exposure during the growing season) was <strong>not attempted</strong>:
            {" "}{yieldResults.real_hazard_ablation.reason}
          </CaveatBanner>

          <p className="mt-3 text-xs text-faint">
            What this doesn&apos;t claim: yield prediction is a real, useful input to exposure
            risk, not a substitute for the actuarial claims/loss-data gap that&apos;s been
            honestly flagged as unresolved since the insurance engine&apos;s first build.
          </p>
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
