"use client";

import { useEffect, useState } from "react";
import CaveatBanner from "../components/CaveatBanner";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface ExposureRow {
  district: string; date: string; hazard: string; hazard_confidence: number;
  crop: string; crop_stage: string | null; vulnerability_weight: number;
  crop_weight?: number; exposure_score: number; agronomically_plausible: boolean;
  crop_mix_source?: string;
}

interface ExposureData {
  scope: string; crops: string[]; n_rows: number;
  n_nonzero_exposure: number; n_nonzero_exposure_implausible: number;
  top_exposure_events: ExposureRow[]; top_plausible_exposure_events: ExposureRow[];
}

interface TierBreakdown {
  crop_share_model: { tier_breakdown_126_districts: Record<string, number> };
}

const TIER_LABEL: Record<string, string> = {
  real_district_area: "Real MNFSR district data",
  model_predicted: "Model-predicted (Track F)",
  hand_classified_mask: "Hand-classified mask (fallback)",
};
const TIER_COLOR: Record<string, string> = {
  real_district_area: "bg-accent-500",
  model_predicted: "bg-[#7aa8c9]",
  hand_classified_mask: "bg-[#3a3a40]",
};

function TierBar({ tiers }: { tiers: Record<string, number> }) {
  const total = Object.values(tiers).reduce((a, b) => a + b, 0);
  const order = ["real_district_area", "model_predicted", "hand_classified_mask"];
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-full border border-soft">
        {order.map((k) =>
          tiers[k] > 0 ? (
            <div key={k} className={TIER_COLOR[k]} style={{ width: `${(tiers[k] / total) * 100}%` }}
                 title={`${TIER_LABEL[k]}: ${tiers[k]}`} />
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

export default function ExposureRiskPage() {
  const [data, setData] = useState<ExposureData | null>(null);
  const [tiers, setTiers] = useState<Record<string, number> | null>(null);
  const [view, setView] = useState<"plausible" | "raw">("plausible");

  useEffect(() => {
    fetch(`${BASE}/data/exposure_risk.json`).then((r) => r.json()).then(setData);
    fetch(`${BASE}/data/track_g_dashboard_summary.json`).then((r) => r.json())
      .then((d: TierBreakdown) => setTiers(d.crop_share_model.tier_breakdown_126_districts));
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading real exposure-risk data...</p>;

  const nPlausible = data.n_nonzero_exposure - data.n_nonzero_exposure_implausible;
  const rows = view === "plausible" ? data.top_plausible_exposure_events : data.top_exposure_events;

  return (
    <div>
      <h1 className="text-xl font-semibold">Exposure Risk &mdash; Hazard &times; Crop Calendar Fusion</h1>
      <p className="mt-1 text-sm text-dim">
        Real district hazard detections &times; the real regional crop calendar &times;
        <code> crop_weight</code> &mdash; the real per-district crop-area share, not just a
        pass/fail gate (Week 9 recalibration).
      </p>

      <CaveatBanner>{data.scope}</CaveatBanner>

      <h2 className="mt-8 text-base font-semibold">The real mechanism: crop_weight, not just a plausibility gate</h2>
      <p className="mt-1 text-sm text-dim">
        <code>exposure_score = hazard_confidence &times; vulnerability_weight &times; crop_weight</code>.
        Through Week 6, <code>crop_weight</code> was a boolean 1.0/0.0 plausibility gate for every
        district. Since Week 9, wherever real MNFSR crop-mix data exists, <code>crop_weight</code> is
        the real proportional area share instead &mdash; a district growing 0.87% cotton now scores
        a small nonzero weight, not a hard pass. The boolean gate only remains for the 11
        hand-classified-mask districts below.
      </p>

      {tiers && (
        <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
          <h3 className="mb-2 text-sm font-semibold">crop_mix_source tier, all 126 real districts</h3>
          <TierBar tiers={tiers} />
        </div>
      )}

      <div className="mt-4 rounded-xl border border-soft bg-elev p-4">
        <h3 className="mb-2 text-sm font-semibold">Real before/after, Week 9 reweighting</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-soft bg-elev-2 p-3">
            <div className="text-xs text-faint">Kasur &middot; cotton (real MNFSR share: 0.87%)</div>
            <div className="tnum mt-1 text-sm">
              <span className="text-faint line-through">0.468</span>{" "}
              <span className="text-accent-500 font-semibold">&rarr; 0.004</span>
            </div>
            <p className="mt-1 text-[11px] text-faint">
              Drops ~99% &mdash; the old boolean gate treated any cotton presence as full-weight;
              the real share is tiny.
            </p>
          </div>
          <div className="rounded-lg border border-soft bg-elev-2 p-3">
            <div className="text-xs text-faint">Sialkot &middot; rice (real MNFSR share: 48.95%)</div>
            <div className="tnum mt-1 text-sm">
              <span className="text-faint line-through">0.39</span>{" "}
              <span className="text-accent-500 font-semibold">&rarr; 0.191</span>
            </div>
            <p className="mt-1 text-[11px] text-faint">
              Drops to about half &mdash; reflects that rice is substantial but not the district&apos;s
              only crop.
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-faint">
          Real consequence: the national max <code>exposure_score</code> fell from ~0.39&ndash;0.68
          (pre-Week-9) to <strong className="text-main">0.225</strong> &mdash; which is why the
          trigger thresholds were recalibrated (see Trigger Engine).
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
        <Stat label="Total rows computed" value={data.n_rows.toLocaleString()} />
        <Stat label="Raw nonzero-exposure" value={data.n_nonzero_exposure.toLocaleString()} />
        <Stat label="Implausible (score=0'd at source)" value={`${data.n_nonzero_exposure_implausible.toLocaleString()}`} />
        <Stat label="Nonzero remaining" value={nPlausible.toLocaleString()} accent />
      </div>
      <p className="mt-2 text-center text-xs text-faint">
        As of Week 9, agronomic implausibility for real/model-tier districts is absorbed into
        <code> crop_weight</code> itself (a near-zero real share, not a hard exclusion) rather than
        a separate boolean filter &mdash; so this count is now {data.n_nonzero_exposure_implausible}, not
        the old Week 4&ndash;6 78% figure. The <code>agronomically_plausible</code> field below still
        reflects the hand-authored plausibility check and remains the only gate for the 11
        hand-classified-mask districts.
      </p>

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
          Raw / unfiltered ({data.n_nonzero_exposure})
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-soft">
        <table className="w-full min-w-[860px] text-xs">
          <thead className="bg-elev-2 text-left text-faint">
            <tr>
              <th className="p-2">District</th><th className="p-2">Date</th><th className="p-2">Hazard</th>
              <th className="p-2">Crop</th><th className="p-2">Stage</th>
              <th className="p-2">crop_weight</th><th className="p-2">Source tier</th>
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
                <td className="p-2 tnum">{r.crop_weight?.toFixed(3) ?? "—"}</td>
                <td className="p-2 text-[11px] text-faint">{r.crop_mix_source ?? "—"}</td>
                <td className="p-2 tnum font-medium">{r.exposure_score}</td>
                <td className="p-2">
                  {r.agronomically_plausible ? (
                    <span className="text-dim">yes</span>
                  ) : (
                    <span className="italic text-faint">excluded &mdash; impossible pairing</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-faint">
        Top {rows.length} rows by exposure_score shown, per crop_calendar.py &amp;
        crop_plausibility.py (both hand-authored this project, not locally validated) and
        the real crop_weight/crop_mix_source from `real_crop_mix.json`.
      </p>
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
