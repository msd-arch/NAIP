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

function AccuracyBar({ label, value, baseline }: { label: string; value: number; baseline: number }) {
  const max = Math.max(value, baseline) * 1.15;
  const belowBaseline = value < baseline;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-dim">{label}</span>
        <span className={`tnum font-semibold ${belowBaseline ? "text-danger" : "text-main"}`}>
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-elev-2">
        <div
          className={`h-full rounded-full ${belowBaseline ? "bg-danger" : "bg-accent"}`}
          style={{ width: `${(value / max) * 100}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-warn"
          style={{ left: `${(baseline / max) * 100}%` }}
          title={`majority-class baseline: ${(baseline * 100).toFixed(1)}%`}
        />
      </div>
    </div>
  );
}

export default function CropClassifierPage() {
  const [data, setData] = useState<Report | null>(null);

  useEffect(() => {
    fetch(`${BASE}/data/crop_classifier_report.json`).then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading real classifier results...</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold">Crop Intelligence &mdash; Irrigation Classifier</h1>
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
          Amber tick = the {(data.majority_class_baseline_accuracy * 100).toFixed(1)}% baseline
          (always guessing &quot;not irrigated&quot;). Red bars sit <strong>below</strong> it &mdash;
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
