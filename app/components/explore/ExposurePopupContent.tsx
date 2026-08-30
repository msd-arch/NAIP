"use client";

import { useState } from "react";
import ExposureCanvas, { exposureAnimKindFor } from "./ExposureCanvas";
import { formatDate } from "../../lib/formatDate";
import type { ExposureRow } from "../../explore/types";

const TIER_LABEL: Record<string, string> = {
  real_district_area: "real MNFSR area data",
  model_estimated_interim: "model-estimated (interim)",
  model_predicted: "model-predicted",
  hand_classified_mask: "hand-classified mask",
};

/** Real click-triggered popup for the Exposure Risk map: a district with
    2+ real scored hazard x crop pairs shows a selection menu first
    ("which hazard interaction would you like to view?"); one real event
    skips straight to its detail -- same navigation pattern as the
    Hazards popup (HazardPopupContent.tsx), reused deliberately rather
    than invented fresh, so the product has one consistent popup
    language instead of two. */
export default function ExposurePopupContent({ district, rows }: { district: string; rows: ExposureRow[] }) {
  const [selected, setSelected] = useState<number | null>(rows.length === 1 ? 0 : null);
  const active = selected != null ? rows[selected] : null;

  return (
    <div className="w-full min-w-0 font-sans">
      <div className="mb-2 flex items-center gap-1.5">
        {active && rows.length > 1 && (
          <button
            onClick={() => setSelected(null)}
            aria-label="Back to event list"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-soft text-dim hover:bg-elev-2"
          >
            ←
          </button>
        )}
        <h4 className="text-sm font-semibold text-main">{district}</h4>
      </div>

      {!active ? (
        <div className="space-y-1.5">
          <p className="text-[11px] text-dim">Which hazard interaction would you like to view?</p>
          {rows.map((r, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className="flex w-full items-center justify-between rounded-lg border border-soft bg-elev-2 px-2.5 py-1.5 text-left text-xs text-main hover:border-secondary-500/50 hover:bg-secondary-soft"
            >
              <span className="capitalize">
                {r.hazard.replace(/_/g, " ")} &times; {r.crop}
              </span>
              <span className="tnum text-[10px] text-faint">{r.exposure_score}</span>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <ExposureCanvas kind={exposureAnimKindFor(active.hazard)} crop={active.crop} />
          <p className="mt-2 text-xs font-medium capitalize text-main">
            {active.hazard.replace(/_/g, " ")} &times; {active.crop}
            {active.crop_stage ? ` (${active.crop_stage})` : ""}
          </p>
          <div className="mt-2 rounded-md bg-elev-2 p-2 text-[11px] leading-relaxed text-dim">
            <div className="flex justify-between border-b border-soft py-1">
              <span className="text-dim">Date</span>
              <span className="tnum font-medium text-main">{formatDate(active.date)}</span>
            </div>
            <div className="flex justify-between border-b border-soft py-1">
              <span className="text-dim">Hazard confidence</span>
              <span className="tnum font-medium text-main">{active.hazard_confidence}</span>
            </div>
            {active.crop_mix_source && (
              <div className="flex justify-between border-b border-soft py-1">
                <span className="text-dim">Crop data source</span>
                <span className="font-medium text-main">{TIER_LABEL[active.crop_mix_source] ?? active.crop_mix_source}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-soft py-1">
              <span className="text-dim">Exposure score</span>
              <span className="tnum font-medium text-main">{active.exposure_score}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-dim">Agronomically plausible</span>
              <span className="font-medium text-main">{active.agronomically_plausible ? "yes" : "no — impossible pairing"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
