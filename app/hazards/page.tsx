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
    return <p className="text-sm text-dim">Loading real district hazard data...</p>;
  }

  const styleFor = (feature: Feature<Geometry, any>) => {
    const name = feature.properties?.shapeName as string;
    const d = byName.get(name);
    const n = d?.n_triggered_rows ?? 0;
    const t = n / maxTriggered;
    // one accent hue, light-to-saturated -- no data reads neutral gray
    const color =
      n === 0 ? "#1c1c20" : t < 0.33 ? "#3c5c58" : t < 0.66 ? "#4fb8ad" : "#7fe0d4";
    return { color: "#33333a", weight: 1, fillColor: color, fillOpacity: 1 };
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
        This is district-level, not farm-level. A district being colored teal means the
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

      <h2 className="mt-10 text-base font-semibold">
        residue_burning: real rule vs. Track E&apos;s trained model score
      </h2>
      <p className="mt-1 text-sm text-dim">
        Every <code>residue_burning</code> alert record in this feed carries two independent
        real signals: the unchanged rule-based <code>flag</code> above, and the trained
        thermal-only GBT classifier&apos;s <code>model_score</code> (Week 7/9, F1=0.346 vs.
        the rule&apos;s F1=0.004 on identical held-out data) &mdash; run side by side, not
        one replacing the other.
      </p>

      {!fire ? (
        <p className="mt-4 text-sm text-dim">Loading real rule-vs-model comparison...</p>
      ) : (
        <>
          <p className="mt-3 text-xs text-dim">
            {fire.real_window} &mdash; {fire.n_records_compared} real records where both
            produced a result.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FireCell label="Both flag" value={fire.both_flagged} tone="match" />
            <FireCell label="Rule only" value={fire.rule_only} tone="plain" />
            <FireCell label="Model only (score ≥ 0.5)" value={fire.model_only} tone="plain" />
            <FireCell label="Neither" value={fire.neither} tone="quiet" />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-faint sm:grid-cols-3">
            <span>Rule flagged: <span className="tnum text-dim">{fire.n_rule_flagged}</span></span>
            <span>
              Model flagged (&ge;0.5):{" "}
              <span className="tnum text-dim">{fire["n_model_flagged_ge_0.5"] ?? fire.n_model_flagged_ge_0_5}</span>
            </span>
            <span>Mean model score: <span className="tnum text-dim">{fire.mean_model_score}</span></span>
          </div>
          <CaveatBanner>{fire.caveat}</CaveatBanner>
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
