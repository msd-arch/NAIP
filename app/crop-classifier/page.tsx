"use client";

import { useEffect, useState } from "react";
import CaveatBanner from "../components/CaveatBanner";

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
        <span className={`tnum font-semibold ${negative ? "text-[#e5484d]" : "text-main"}`}>
          R² = {r2.toFixed(3)} {negative && "(real, reported failure)"}
        </span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-elev-2">
        <div className="absolute left-1/2 top-0 h-full w-px bg-[var(--text)] opacity-40" />
        <div
          className={`absolute top-0 h-full rounded-full ${negative ? "bg-[#e5484d]/70" : "bg-accent-500"}`}
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
          className={`h-full rounded-full ${belowBaseline ? "bg-[#3a3a40]" : "bg-accent-500"}`}
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

export default function CropClassifierPage() {
  const [data, setData] = useState<Report | null>(null);
  const [trackF, setTrackF] = useState<TrackFResults | null>(null);

  useEffect(() => {
    fetch(`${BASE}/data/crop_classifier_report.json`).then((r) => r.json()).then(setData);
    fetch(`${BASE}/data/track_f_results.json`).then((r) => r.json()).then(setTrackF);
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading real classifier results...</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold">Crop Intelligence</h1>
      <p className="mt-1 text-sm text-dim">
        Two real, separately-scoped classifiers: Week 2&apos;s pilot-region irrigation
        classifier below, and Track F&apos;s national per-crop area-share regressor
        further down &mdash; different farms, different districts, different real
        ground truth, not one superseding the other.
      </p>

      <h2 className="mt-6 text-base font-semibold">Irrigation classifier (Week 2, 120-farm pilot)</h2>
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

      <h2 className="mt-8 text-base font-semibold">
        National crop-share regressor (Track F, 115-district scope)
      </h2>
      <p className="mt-1 text-sm text-dim">
        Predicts real per-crop area SHARES (wheat/cotton/rice/sugarcane), not a single
        dominant crop &mdash; a literal &ldquo;classifier&rdquo; framing was checked
        first and found degenerate (wheat dominant in 93% of real districts).
      </p>

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
