"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import CaveatBanner from "../components/CaveatBanner";
import type { Feature, Geometry } from "geojson";

const DistrictChoropleth = dynamic(() => import("../components/DistrictChoropleth"), { ssr: false });

interface DistrictSummary {
  district: string;
  lat: number;
  lon: number;
  n_rows: number;
  n_triggered_rows: number;
  hazards_triggered: Record<string, number>;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function HazardsPage() {
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [summary, setSummary] = useState<{ districts: DistrictSummary[] } | null>(null);
  const [selected, setSelected] = useState<DistrictSummary | null>(null);

  useEffect(() => {
    fetch(`${BASE}/data/pk_districts.geojson`).then((r) => r.json()).then(setGeo);
    fetch(`${BASE}/data/district_hazard_summary.json`).then((r) => r.json()).then(setSummary);
  }, []);

  const byName = useMemo(() => {
    const m = new Map<string, DistrictSummary>();
    summary?.districts.forEach((d) => m.set(d.district, d));
    return m;
  }, [summary]);

  const maxTriggered = useMemo(
    () => Math.max(1, ...(summary?.districts.map((d) => d.n_triggered_rows) ?? [1])),
    [summary]
  );

  if (!geo || !summary) {
    return <p className="text-sm text-dim">Loading real district hazard data...</p>;
  }

  const styleFor = (feature: Feature<Geometry, any>) => {
    const name = feature.properties?.shapeName as string;
    const d = byName.get(name);
    const n = d?.n_triggered_rows ?? 0;
    const intensity = n / maxTriggered;
    const color = n === 0 ? "#2a3444" : `rgba(239, 68, 68, ${0.15 + intensity * 0.75})`;
    return { color: "#4da3ff33", weight: 1, fillColor: color, fillOpacity: 1 };
  };

  const onEachFeature = (feature: Feature<Geometry, any>, layer: any) => {
    const name = feature.properties?.shapeName as string;
    const d = byName.get(name);
    layer.on("click", () => setSelected(d ?? null));
    layer.bindTooltip(`${name}: ${d?.n_triggered_rows ?? 0} triggered rows`, { sticky: true });
  };

  return (
    <div>
      <h1 className="text-xl font-semibold">National Hazards</h1>
      <p className="mt-1 text-sm text-dim">
        126 real districts, real 11-detector hazard engine (<code>hazards.py</code>, Week
        1). Color = number of triggered district-day-hazard rows out of{" "}
        {summary.districts.reduce((s, d) => s + d.n_rows, 0).toLocaleString()} total real
        observations.
      </p>

      <CaveatBanner>
        This is district-level, not farm-level. A district being colored red means the
        0.25&deg; (~27km) grid-cell reading for that district triggered a hazard on at
        least one real day in the 71-frame archive (2026-06-22..07-20) &mdash; it does
        not mean every farm in that district experienced it. See the Insurance Trigger
        Engine view for how this maps (or mostly doesn&apos;t) onto real farm coverage.
      </CaveatBanner>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DistrictChoropleth districtsGeojson={geo} styleFor={styleFor} onEachFeature={onEachFeature} />
        </div>
        <div className="rounded-xl border border-soft bg-elev p-4">
          {selected ? (
            <>
              <h2 className="text-sm font-semibold">{selected.district}</h2>
              <p className="mt-1 text-xs text-dim">
                {selected.n_triggered_rows} / {selected.n_rows} district-day-hazard rows
                triggered
              </p>
              <ul className="mt-3 space-y-1 text-xs">
                {Object.entries(selected.hazards_triggered)
                  .sort((a, b) => b[1] - a[1])
                  .map(([hazard, n]) => (
                    <li key={hazard} className="flex justify-between border-b border-soft py-1">
                      <span className="text-dim">{hazard.replace("_", " ")}</span>
                      <span className="tnum font-medium">{n}</span>
                    </li>
                  ))}
                {Object.keys(selected.hazards_triggered).length === 0 && (
                  <li className="text-faint">No triggers in the real archive for this district.</li>
                )}
              </ul>
            </>
          ) : (
            <p className="text-sm text-faint">Click a district on the map to see its real hazard breakdown.</p>
          )}
        </div>
      </div>
    </div>
  );
}
