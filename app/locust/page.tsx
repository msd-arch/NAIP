"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import CaveatBanner from "../components/CaveatBanner";

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

  if (!data || !geo) return <p className="text-sm text-dim">Loading real locust breeding-risk data...</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold">Desert Locust Breeding-Risk Monitor</h1>
      <p className="mt-1 text-sm text-dim">
        Real SMAP soil-moisture-anomaly + real Sentinel-2 NDVI green-up, over the 3 named
        breeding grounds. Solid teal = real district boundary. Dashed amber = Cholistan
        proxy (see caveat).
      </p>

      <CaveatBanner>{data.scope}</CaveatBanner>

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
            {r.boundary_type !== "real_district" && (
              <p className="mt-1.5 text-[11px] text-warn">{r.boundary_note}</p>
            )}
            <dl className="mt-3 space-y-1.5 text-xs">
              <Row k="Soil moisture anomaly" v={`${r.sm_surface_anomaly_m3m3?.toFixed(4)} m3/m3`}
                   good={r.soil_favorable_for_egglaying} />
              <Row k="NDVI green-up (30d delta)" v={r.ndvi_delta?.toFixed(3) ?? "n/a"}
                   good={r.vegetation_greenup_detected} />
              <Row k="Confidence" v={r.confidence.toFixed(2)} />
            </dl>
            <p className="mt-3 text-[11px] text-faint">
              Window: {r.window_recent[0]} to {r.window_recent[1]}
            </p>
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
