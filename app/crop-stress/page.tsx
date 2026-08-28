"use client";

import { useEffect, useState } from "react";

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

  if (!data) return <p className="text-sm text-dim">Loading...</p>;

  const rows = view === "both"
    ? data.district_results.filter((r) => r.district_flag_both_signals)
    : data.district_results.filter((r) => r.district_flag_either_signal);

  return (
    <div>
      <h1 className="text-xl font-semibold">Crop Stress Early-Warning Screen</h1>
      <p className="mt-2 text-sm text-dim">
        This looks for early signs that crops might be under stress, using satellite images of
        plant health. It can&apos;t tell you why &mdash; only that something looks unusual and
        worth checking on the ground. It is not a disease or pest diagnosis.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
        <Stat label="Points checked" value={data.n_points_total.toLocaleString()} />
        <Stat label="Districts covered" value={`${data.n_districts_covered}/126`} />
        <Stat label="Flagged, either sign" value={`${data.n_districts_flagged_either_signal}`} />
        <Stat label="Flagged, both signs" value={`${data.n_districts_flagged_both_signals}`} accent />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-soft bg-elev p-4">
          <h3 className="mb-1 text-sm font-semibold">Sign 1 &mdash; looking less healthy than usual</h3>
          <p className="text-xs text-dim">
            {data.signal_1_level_anomaly.n_points_flagged} points flagged
          </p>
        </div>
        <div className="rounded-xl border border-soft bg-elev p-4">
          <h3 className="mb-1 text-sm font-semibold">Sign 2 &mdash; declining faster than usual</h3>
          <p className="text-xs text-dim">
            {data.signal_2_senescence_anomaly.n_points_flagged} points flagged
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-5 border-b border-soft">
        <button
          onClick={() => setView("both")}
          className={`border-b-2 pb-2 text-xs font-medium transition-colors ${view === "both" ? "border-accent-500 text-accent-500" : "border-transparent text-faint hover:text-dim"}`}
        >
          Both signs ({data.n_districts_flagged_both_signals})
        </button>
        <button
          onClick={() => setView("either")}
          className={`border-b-2 pb-2 text-xs font-medium transition-colors ${view === "either" ? "border-accent-500 text-accent-500" : "border-transparent text-faint hover:text-dim"}`}
        >
          Either sign ({data.n_districts_flagged_either_signal})
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-soft">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="bg-elev-2 text-faint">
            <tr>
              <th className="p-2">District</th><th className="p-2">Points</th>
              <th className="p-2">Sign 1</th><th className="p-2">Sign 2</th>
              <th className="p-2">Both</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="mt-3 text-sm text-dim">No districts in this view.</p>}
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
