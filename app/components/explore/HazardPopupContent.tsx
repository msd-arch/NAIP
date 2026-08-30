"use client";

import { useState } from "react";
import HazardCanvas, { animationKindFor } from "./HazardCanvas";
import { HAZARD_INFO, HAZARD_LABEL } from "../../lib/hazardInfo";
import { formatDate } from "../../lib/formatDate";
import { useAppLocale } from "../../i18n/LocaleProvider";
import type { DistrictHazardCurrentEntry } from "../../explore/types";

/** Real click-triggered popup for the National Hazards Live window: a
    district with 2+ real currently-flagged hazards shows a selection menu
    first ("which hazard animation would you like to view?"); one real
    flagged hazard skips straight to its detail (nothing to choose between).
    Own local state, remounted fresh per popup open (see ExploreMap.tsx),
    so "back" always resets correctly between different districts. */
export default function HazardPopupContent({
  district,
  hazards,
}: {
  district: string;
  hazards: DistrictHazardCurrentEntry[];
}) {
  const [selected, setSelected] = useState<string | null>(hazards.length === 1 ? hazards[0].hazard : null);
  const { locale } = useAppLocale();

  const active = hazards.find((h) => h.hazard === selected) ?? null;

  return (
    <div className="w-full min-w-0 font-sans">
      <div className="mb-2 flex items-center gap-1.5">
        {active && hazards.length > 1 && (
          <button
            onClick={() => setSelected(null)}
            aria-label="Back to hazard list"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-soft text-dim hover:bg-elev-2"
          >
            ←
          </button>
        )}
        <h4 className="text-sm font-semibold text-main">{district}</h4>
      </div>

      {!active ? (
        <div className="space-y-1.5">
          <p className="text-[11px] text-dim">Which hazard animation would you like to view?</p>
          {hazards.map((h) => (
            <button
              key={h.hazard}
              onClick={() => setSelected(h.hazard)}
              className="flex w-full items-center justify-between rounded-lg border border-soft bg-elev-2 px-2.5 py-1.5 text-left text-xs text-main hover:border-secondary-500/50 hover:bg-secondary-soft"
            >
              <span className="capitalize">{HAZARD_LABEL[h.hazard] ?? h.hazard.replace(/_/g, " ")}</span>
              <span className="text-[10px] text-faint">{Math.round(h.max_confidence * 100)}%</span>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <HazardCanvas kind={animationKindFor(active.hazard, active.message_en)} />
          <p className="mt-2 text-xs font-medium text-main">
            {HAZARD_LABEL[active.hazard] ?? active.hazard.replace(/_/g, " ")}
          </p>
          {HAZARD_INFO[active.hazard] && (
            <p className="mt-1 text-[11px] leading-relaxed text-dim">{HAZARD_INFO[active.hazard]}</p>
          )}
          <div className="mt-2 rounded-md bg-elev-2 p-2">
            <p
              className={`text-[11px] leading-relaxed text-dim ${locale === "ur" ? "urdu-text" : ""}`}
              dir={locale === "ur" ? "rtl" : undefined}
            >
              {locale === "ur" ? active.message_ur : active.message_en}
            </p>
            <p className="mt-1 text-[10px] text-faint">
              as of {formatDate(active.date)} · confidence {Math.round(active.max_confidence * 100)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
