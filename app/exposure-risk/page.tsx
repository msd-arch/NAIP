"use client";

import { useEffect, useState } from "react";
import CaveatBanner from "../components/CaveatBanner";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface ExposureRow {
  district: string; date: string; hazard: string; hazard_confidence: number;
  crop: string; crop_stage: string | null; vulnerability_weight: number;
  exposure_score: number; agronomically_plausible: boolean;
}

interface ExposureData {
  scope: string; crops: string[]; n_rows: number;
  n_nonzero_exposure: number; n_nonzero_exposure_implausible: number;
  top_exposure_events: ExposureRow[]; top_plausible_exposure_events: ExposureRow[];
}

export default function ExposureRiskPage() {
  const [data, setData] = useState<ExposureData | null>(null);
  const [view, setView] = useState<"plausible" | "raw">("plausible");

  useEffect(() => {
    fetch(`${BASE}/data/exposure_risk.json`).then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading real exposure-risk data...</p>;

  const nPlausible = data.n_nonzero_exposure - data.n_nonzero_exposure_implausible;
  const rows = view === "plausible" ? data.top_plausible_exposure_events : data.top_exposure_events;

  return (
    <div>
      <h1 className="text-xl font-semibold">Exposure Risk &mdash; Hazard &times; Crop Calendar Fusion</h1>
      <p className="mt-1 text-sm text-dim">
        Real district hazard detections &times; the real regional crop calendar, filtered
        through the Week 4 agronomic-plausibility mask.
      </p>

      <CaveatBanner>{data.scope}</CaveatBanner>

      <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
        <Stat label="Total rows computed" value={data.n_rows.toLocaleString()} />
        <Stat label="Raw nonzero-exposure" value={data.n_nonzero_exposure.toLocaleString()} />
        <Stat label="Removed as implausible" value={`-${data.n_nonzero_exposure_implausible.toLocaleString()}`} accent="danger" />
        <Stat label="Plausible nonzero remaining" value={nPlausible.toLocaleString()} accent="accent" />
      </div>
      <p className="mt-2 text-center text-xs text-faint">
        {data.n_nonzero_exposure_implausible} of {data.n_nonzero_exposure} raw nonzero rows
        (78%) were agronomically implausible &mdash; e.g. cotton risk flagged in Skardu, a
        district that would never grow cotton &mdash; and are excluded from the plausible view.
      </p>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setView("plausible")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${view === "plausible" ? "bg-accent text-[#05244a]" : "border border-soft text-dim"}`}
        >
          Plausible only ({nPlausible})
        </button>
        <button
          onClick={() => setView("raw")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${view === "raw" ? "bg-accent text-[#05244a]" : "border border-soft text-dim"}`}
        >
          Raw / unfiltered ({data.n_nonzero_exposure})
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-soft">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="bg-elev-2 text-left text-faint">
            <tr>
              <th className="p-2">District</th><th className="p-2">Date</th><th className="p-2">Hazard</th>
              <th className="p-2">Crop</th><th className="p-2">Stage</th><th className="p-2">Score</th>
              <th className="p-2">Plausible?</th>
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
                    <span className="text-accent">yes</span>
                  ) : (
                    <span className="text-danger">no &mdash; impossible pairing</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-faint">
        Top {rows.length} rows by exposure_score shown, per crop_calendar.py &amp;
        crop_plausibility.py (both hand-authored this project, not locally validated).
      </p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "danger" | "accent" }) {
  const color = accent === "danger" ? "text-danger" : accent === "accent" ? "text-accent" : "text-main";
  return (
    <div className="rounded-xl border border-soft bg-elev p-3">
      <div className={`tnum text-lg font-semibold ${color}`}>{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}
