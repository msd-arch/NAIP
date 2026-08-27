"use client";

import { useEffect, useState } from "react";
import CaveatBanner from "../components/CaveatBanner";
import TechNote from "../components/TechNote";
import DisclaimerBar from "../components/DisclaimerBar";
import ProvenanceLine from "../components/ProvenanceLine";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface DistrictResult {
  district: string; tier: string; n_points: number;
  mean_level_z_score: number;
  n_points_level_anomaly: number; n_points_senescence_anomaly: number;
  n_points_both_signals: number; frac_points_any_flag: number;
  district_flag_either_signal: boolean; district_flag_both_signals: boolean;
}

interface ScreenData {
  not_a_diagnosis_notice: string;
  generated_note: string;
  signal_1_level_anomaly: { method: string; n_points_flagged: number };
  signal_2_senescence_anomaly: { method: string; n_points_flagged: number; n_points_missing_slope_data: number };
  n_points_total: number; n_points_either_signal: number; n_points_both_signals: number;
  n_districts_covered: number;
  n_districts_flagged_either_signal: number; n_districts_flagged_both_signals: number;
  district_results: DistrictResult[];
}

export default function CropStressPage() {
  const [data, setData] = useState<ScreenData | null>(null);
  const [view, setView] = useState<"both" | "either">("both");

  useEffect(() => {
    fetch(`${BASE}/data/crop_stress_screen.json`).then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading real crop-stress screen data...</p>;

  const rows = view === "both"
    ? data.district_results.filter((r) => r.district_flag_both_signals)
    : data.district_results.filter((r) => r.district_flag_either_signal);

  return (
    <div>
      <h1 className="text-xl font-semibold">Crop Stress Early-Warning Screen</h1>
      <p className="mt-1 text-sm text-dim">
        A real pre-check found no extractable per-location pest/disease
        surveillance dataset for Pakistan — this is the honest fallback the scope document named,
        not a disease detector.
      </p>
      <TechNote>Internally &ldquo;Phase 5, Track Q.&rdquo;</TechNote>

      <DisclaimerBar>
        <span className="font-bold uppercase tracking-wide">Not a pest or disease diagnosis. </span>
        {data.not_a_diagnosis_notice}
      </DisclaimerBar>

      <CaveatBanner>{data.generated_note}</CaveatBanner>

      <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
        <Stat label="Real points screened" value={data.n_points_total.toLocaleString()} />
        <Stat label="Districts covered" value={`${data.n_districts_covered}/126`} />
        <Stat label="Flagged, either signal" value={`${data.n_districts_flagged_either_signal}`} />
        <Stat label="Flagged, BOTH signals" value={`${data.n_districts_flagged_both_signals}`} accent />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-soft bg-elev p-4">
          <h3 className="mb-1 text-sm font-semibold">Signal 1 — level anomaly</h3>
          <p className="text-[11px] text-faint">
            Current NDVI below this location&apos;s own real 21-year historical norm (bottom
            decile nationally). Same real method as the National Drought Signal — more
            consistent with sustained/chronic conditions.
          </p>
          <p className="mt-2 text-xs text-dim">
            {data.signal_1_level_anomaly.n_points_flagged} real points flagged
          </p>
        </div>
        <div className="rounded-xl border border-soft bg-elev p-4">
          <h3 className="mb-1 text-sm font-semibold">Signal 2 — senescence anomaly</h3>
          <p className="text-[11px] text-faint">
            Within-season NDVI decline steeper than typical (bottom decile nationally) — new
            this track, more consistent with an acute stress event than Signal 1&apos;s
            chronic-level check.
          </p>
          <p className="mt-2 text-xs text-dim">
            {data.signal_2_senescence_anomaly.n_points_flagged} real points flagged
            {" "}({data.signal_2_senescence_anomaly.n_points_missing_slope_data} points missing
            real slope data, excluded)
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-faint">
        The two signals are reported separately, never merged into one opaque score — a district
        showing <strong>both</strong> real signals at once is a genuinely rarer, more selective
        real pattern (requiring a point to be simultaneously in the bottom decile on two
        independent measures) than either alone. &ldquo;Either signal&rdquo; is a real but looser
        view — with ~25 real points per district and each signal independently flagging ~10% of
        all points nationally, a district can cross a 10%-of-points bar by national-distribution
        chance alone. Neither view is a diagnosis of anything.
      </p>

      <div className="mt-6 flex gap-5 border-b border-soft">
        <button
          onClick={() => setView("both")}
          className={`border-b-2 pb-2 text-xs font-medium transition-colors ${view === "both" ? "border-accent-500 text-accent-500" : "border-transparent text-faint hover:text-dim"}`}
        >
          Both signals ({data.n_districts_flagged_both_signals}) — the real, stronger case
        </button>
        <button
          onClick={() => setView("either")}
          className={`border-b-2 pb-2 text-xs font-medium transition-colors ${view === "either" ? "border-accent-500 text-accent-500" : "border-transparent text-faint hover:text-dim"}`}
        >
          Either signal ({data.n_districts_flagged_either_signal}) — the looser view
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-soft">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-elev-2 text-faint">
            <tr>
              <th className="p-2">District</th><th className="p-2">Real points</th>
              <th className="p-2">Level anomaly</th><th className="p-2">Senescence anomaly</th>
              <th className="p-2">Both</th><th className="p-2">Mean level z-score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.district} className="border-t border-soft">
                <td className="p-2 text-main">{r.district}</td>
                <td className="p-2 tnum text-dim">{r.n_points}</td>
                <td className="p-2 tnum text-dim">{r.n_points_level_anomaly}</td>
                <td className="p-2 tnum text-dim">{r.n_points_senescence_anomaly}</td>
                <td className={`p-2 tnum font-medium ${r.n_points_both_signals > 0 ? "text-warn" : "text-faint"}`}>
                  {r.n_points_both_signals}
                </td>
                <td className="p-2 tnum text-dim">{r.mean_level_z_score.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="mt-3 text-sm text-dim">No districts in this view.</p>}
      <ProvenanceLine source="crop_stress_screen.json" updated="Week 23" />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-soft bg-elev p-3">
      <div className={`tnum text-lg font-semibold ${accent ? "text-warn" : "text-main"}`}>{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}
