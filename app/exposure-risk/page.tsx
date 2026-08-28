"use client";

import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface ExposureRow {
  district: string; date: string; hazard: string; hazard_confidence: number;
  crop: string; crop_stage: string | null; vulnerability_weight: number;
  crop_weight?: number; exposure_score: number; agronomically_plausible: boolean;
  crop_mix_source?: string;
  interim_confidence_multiplier?: number; exposure_score_before_confidence_discount?: number;
}

interface ExposureData {
  scope: string; crops: string[]; n_rows: number;
  n_nonzero_exposure: number; n_nonzero_exposure_implausible: number;
  crop_mix_source_breakdown?: Record<string, number>;
  top_exposure_events: ExposureRow[]; top_plausible_exposure_events: ExposureRow[];
}

const TIER_LABEL: Record<string, string> = {
  real_district_area: "Real government data",
  model_estimated_interim: "Model's best guess",
  hand_classified_mask: "Manual estimate (11 districts)",
};
const TIER_COLOR: Record<string, string> = {
  real_district_area: "bg-accent-500",
  model_estimated_interim: "bg-secondary-500",
  hand_classified_mask: "bg-[#8c8878]",
};
const TIER_ORDER = ["real_district_area", "model_estimated_interim", "hand_classified_mask"];

function TierBar({ tiers, unit }: { tiers: Record<string, number>; unit: string }) {
  const total = Object.values(tiers).reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-full border border-soft">
        {TIER_ORDER.map((k) =>
          tiers[k] > 0 ? (
            <div key={k} className={TIER_COLOR[k]} style={{ width: `${(tiers[k] / total) * 100}%` }}
                 title={`${TIER_LABEL[k]}: ${tiers[k].toLocaleString()}`} />
          ) : null
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dim">
        {TIER_ORDER.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${TIER_COLOR[k]}`} />
            {TIER_LABEL[k]}: <span className="tnum font-semibold text-main">{(tiers[k] ?? 0).toLocaleString()}</span>{unit}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ExposureRiskPage() {
  const [data, setData] = useState<ExposureData | null>(null);
  const [view, setView] = useState<"plausible" | "raw">("plausible");

  useEffect(() => {
    fetch(`${BASE}/data/exposure_risk.json`).then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading...</p>;

  const nPlausible = data.n_nonzero_exposure - data.n_nonzero_exposure_implausible;
  const rows = view === "plausible" ? data.top_plausible_exposure_events : data.top_exposure_events;

  return (
    <div>
      <h1 className="text-xl font-semibold">Exposure Risk</h1>
      <p className="mt-2 text-sm text-dim">
        This combines two things: how serious a hazard is, and how much of a district&apos;s
        farmland actually grows the crop it affects. A hazard in a district that barely grows
        that crop scores low; the same hazard where the crop is common scores high.
      </p>

      {data.crop_mix_source_breakdown && (
        <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
          <h3 className="mb-2 text-sm font-semibold">Where the crop data comes from</h3>
          <TierBar tiers={data.crop_mix_source_breakdown} unit=" rows" />
        </div>
      )}

      <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
        <h3 className="mb-2 text-sm font-semibold">Example</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-soft bg-elev-2 p-3">
            <div className="text-xs text-faint">Kasur &middot; cotton (only 0.87% of farmland)</div>
            <div className="tnum mt-1 text-sm">
              score <span className="text-accent-500 font-semibold">0.004</span> &mdash; very low, correctly
            </div>
          </div>
          <div className="rounded-lg border border-soft bg-elev-2 p-3">
            <div className="text-xs text-faint">Sialkot &middot; rice (48.95% of farmland)</div>
            <div className="tnum mt-1 text-sm">
              score <span className="text-accent-500 font-semibold">0.191</span> &mdash; meaningfully higher
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
        <Stat label="Total checked" value={data.n_rows.toLocaleString()} />
        <Stat label="With some risk" value={data.n_nonzero_exposure.toLocaleString()} />
        <Stat label="Ruled out" value={`${data.n_nonzero_exposure_implausible.toLocaleString()}`} />
        <Stat label="Remaining" value={nPlausible.toLocaleString()} accent />
      </div>

      <div className="mt-6 flex gap-5 border-b border-soft">
        <button
          onClick={() => setView("plausible")}
          className={`border-b-2 pb-2 text-xs font-medium transition-colors ${view === "plausible" ? "border-accent-500 text-accent-500" : "border-transparent text-faint hover:text-dim"}`}
        >
          Plausible only ({nPlausible})
        </button>
        <button
          onClick={() => setView("raw")}
          className={`border-b-2 pb-2 text-xs font-medium transition-colors ${view === "raw" ? "border-accent-500 text-accent-500" : "border-transparent text-faint hover:text-dim"}`}
        >
          All results ({data.n_nonzero_exposure})
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-soft">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="bg-elev-2 text-left text-faint">
            <tr>
              <th className="p-2">District</th><th className="p-2">Date</th><th className="p-2">Hazard</th>
              <th className="p-2">Crop</th><th className="p-2">Stage</th>
              <th className="p-2">Score</th><th className="p-2">Plausible?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-soft">
                <td className="p-2">{r.district}</td>
                <td className="p-2 tnum">{r.date}</td>
                <td className="p-2">{r.hazard.replace("_", " ")}</td>
                <td className="p-2">{r.crop}</td>
                <td className="p-2 text-dim">{r.crop_stage}</td>
                <td className="p-2 tnum font-medium">{r.exposure_score}</td>
                <td className="p-2">
                  {r.agronomically_plausible ? (
                    <span className="text-dim">yes</span>
                  ) : (
                    <span className="italic text-faint">no &mdash; impossible pairing</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-soft bg-elev p-3">
      <div className={`tnum text-lg font-semibold ${accent ? "text-accent-500" : "text-main"}`}>{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}
