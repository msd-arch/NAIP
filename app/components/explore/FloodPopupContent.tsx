"use client";

import FloodCanvas from "./FloodCanvas";
import type { FloodDistrictResult } from "../../explore/types";

/** Real click-triggered popup for the Flood Risk Screen: unlike the
    Hazards/Exposure popups, there's no selection menu -- Track D/I's
    real model emits exactly one score per district, so there's only
    ever one real thing to show, same "no menu when there's nothing to
    choose between" rule CropStressPopupContent already follows. */
export default function FloodPopupContent({ district, row }: { district: string; row: FloodDistrictResult }) {
  if (row.mean_model_score == null) return null;
  return (
    <div className="w-full min-w-0 font-sans">
      <h4 className="mb-2 text-sm font-semibold text-main">{district}</h4>

      <div className="mb-3">
        <div className="flex justify-between border-b border-soft py-1 text-[11px]">
          <span className="text-dim">Model score</span>
          <span className="tnum font-medium text-main">{row.mean_model_score.toFixed(3)}</span>
        </div>
        {row.mean_precip_anomaly_pct != null && (
          <div className="flex justify-between border-b border-soft py-1 text-[11px]">
            <span className="text-dim">Precipitation anomaly</span>
            <span className="tnum font-medium text-main">
              {row.mean_precip_anomaly_pct > 0 ? "+" : ""}
              {row.mean_precip_anomaly_pct.toFixed(1)}%
            </span>
          </div>
        )}
        <div className="flex justify-between py-1 text-[11px]">
          <span className="text-dim">Flagged</span>
          <span className="font-medium text-main">{row.flag ? "yes" : "no"}</span>
        </div>
      </div>

      <FloodCanvas modelScore={row.mean_model_score} precipAnomalyPct={row.mean_precip_anomaly_pct} />

      <div className="mt-2 rounded-md bg-elev-2 p-2 text-[11px] leading-relaxed text-dim">
        Water-rise depth and flow-particle density/speed are real, driven by this district&apos;s own model
        score and precipitation anomaly. The flow direction and the highlighted low-lying grid cells are
        illustrative motion/layout, not real flow-direction or inundation-extent data &mdash; neither exists
        at sub-district resolution in the underlying model.
      </div>
    </div>
  );
}
