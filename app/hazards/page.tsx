"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import PipelineHealthBadge from "../components/PipelineHealthBadge";
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

interface FireClassifierSummary {
  real_window: string;
  n_records_compared: number;
  n_rule_flagged: number;
  "n_model_flagged_ge_0.5"?: number;
  n_model_flagged_ge_0_5?: number;
  both_flagged: number;
  rule_only: number;
  model_only: number;
  neither: number;
  mean_model_score: number;
  caveat: string;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function HazardsPage() {
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [summary, setSummary] = useState<{ districts: DistrictSummary[] } | null>(null);
  const [selected, setSelected] = useState<DistrictSummary | null>(null);
  const [fire, setFire] = useState<FireClassifierSummary | null>(null);

  useEffect(() => {
    fetch(`${BASE}/data/pk_districts.geojson`).then((r) => r.json()).then(setGeo);
    fetch(`${BASE}/data/district_hazard_summary.json`).then((r) => r.json()).then(setSummary);
    fetch(`${BASE}/data/track_g_dashboard_summary.json`).then((r) => r.json()).then((d) => setFire(d.fire_classifier));
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
    return <p className="text-sm text-dim">Loading...</p>;
  }

  const styleFor = (feature: Feature<Geometry, any>) => {
    const name = feature.properties?.shapeName as string;
    const d = byName.get(name);
    const n = d?.n_triggered_rows ?? 0;
    const t = n / maxTriggered;
    const color =
      n === 0 ? "#e8e2d1" : t < 0.33 ? "#bcd9b3" : t < 0.66 ? "#4a8f3c" : "#2f5e26";
    return { color: "#8c8878", weight: 1, fillColor: color, fillOpacity: 1 };
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
      <p className="mt-2 text-sm text-dim">
        This map shows weather hazards found across Pakistan&apos;s districts &mdash; things
        like frost, heat waves, hail, or fog. Darker green means more hazards were found there.
        Click any district to see what was detected.
      </p>

      <div className="mt-3">
        <PipelineHealthBadge />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DistrictChoropleth districtsGeojson={geo} styleFor={styleFor} onEachFeature={onEachFeature} />
        </div>
        <div className="rounded-xl border border-soft bg-elev p-4">
          {selected ? (
            <>
              <h2 className="text-sm font-semibold">{selected.district}</h2>
              <p className="mt-1 text-xs text-dim">
                {selected.n_triggered_rows} hazard alert{selected.n_triggered_rows === 1 ? "" : "s"} found here
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
                  <li className="text-faint">Nothing detected here.</li>
                )}
              </ul>
            </>
          ) : (
            <p className="text-sm text-faint">Click a district on the map to see what was detected.</p>
          )}
        </div>
      </div>

      <h2 className="mt-10 text-base font-semibold">Crop-Burning Fires</h2>
      <p className="mt-2 text-sm text-dim">
        Farmers sometimes burn leftover crop stalks after harvest, and these fires can be spotted
        from space. We check for these fires two ways &mdash; a simple rule, and a trained
        computer model &mdash; and compare how often they agree.
      </p>

      {!fire ? (
        <p className="mt-4 text-sm text-dim">Loading...</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FireCell label="Both agree" value={fire.both_flagged} tone="match" />
            <FireCell label="Rule only" value={fire.rule_only} tone="plain" />
            <FireCell label="Model only" value={fire.model_only} tone="plain" />
            <FireCell label="Neither" value={fire.neither} tone="quiet" />
          </div>
        </>
      )}
    </div>
  );
}

function FireCell({ label, value, tone }: { label: string; value: number; tone: "match" | "plain" | "quiet" }) {
  const toneClass = {
    match: "border-accent-500/40 bg-accent-500/10",
    plain: "border-soft bg-elev-2",
    quiet: "border-soft bg-elev",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 text-center ${toneClass}`}>
      <div className="tnum text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}
