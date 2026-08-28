"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const LocustMap = dynamic(() => import("../components/LocustMap"), { ssr: false });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface Region {
  region: string; boundary_type: string; boundary_note: string;
  window_recent: [string, string]; window_prior: [string, string];
  sm_surface_m3m3: number | null; sm_surface_anomaly_m3m3: number | null;
  ndvi_recent_30d: number | null; ndvi_prior_30d: number | null; ndvi_delta: number | null;
  soil_favorable_for_egglaying: boolean; vegetation_greenup_detected: boolean;
  breeding_risk_flag: boolean; confidence: number; source: string;
}

export default function LocustPage() {
  const [data, setData] = useState<{ scope: string; regions: Region[] } | null>(null);
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    fetch(`${BASE}/data/locust_risk.json`).then((r) => r.json()).then(setData);
    fetch(`${BASE}/data/pk_districts.geojson`).then((r) => r.json()).then(setGeo);
  }, []);

  if (!data || !geo) return <p className="text-sm text-dim">Loading...</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold">Desert Locust Breeding-Risk Monitor</h1>
      <p className="mt-2 text-sm text-dim">
        Locusts breed when the soil is damp and plants start growing again. This page checks
        soil moisture and plant growth in three known breeding areas, and flags a region when
        both conditions look right for breeding.
      </p>

      <div className="mt-4">
        <LocustMap districtsGeojson={geo} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {data.regions.map((r) => (
          <div key={r.region} className="rounded-xl border border-soft bg-elev p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{r.region}</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  r.breeding_risk_flag ? "bg-critical text-white" : "border border-soft text-faint"
                }`}
              >
                {r.breeding_risk_flag ? "Flagged" : "Not flagged"}
              </span>
            </div>
            <dl className="mt-3 space-y-1.5 text-xs">
              <Row k="Soil damp enough?" v={r.soil_favorable_for_egglaying ? "Yes" : "No"} good={r.soil_favorable_for_egglaying} />
              <Row k="Plants greening up?" v={r.vegetation_greenup_detected ? "Yes" : "No"} good={r.vegetation_greenup_detected} />
              <Row k="Confidence" v={`${Math.round(r.confidence * 100)}%`} />
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ k, v, good }: { k: string; v: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-soft py-1">
      <span className="text-dim">{k}</span>
      <span className={`tnum font-medium ${good === true ? "text-accent-500" : good === false ? "text-faint" : ""}`}>{v}</span>
    </div>
  );
}
