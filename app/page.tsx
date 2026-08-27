"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import StatsTicker from "./components/StatsTicker";
import PipelineHealthBadge from "./components/PipelineHealthBadge";
import DisclaimerBar from "./components/DisclaimerBar";

const DistrictChoropleth = dynamic(() => import("./components/DistrictChoropleth"), { ssr: false });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface DistrictSummary {
  district: string; n_rows: number; n_triggered_rows: number;
  hazards_triggered: Record<string, number>;
}

const MODULES = [
  { href: "/hazards", label: "National Hazards", caption: "126-district hazard feed, real 11-detector engine", metricKey: "hazardTriggered" },
  { href: "/water-stress", label: "Water Stress", caption: "Muridke Distributary, SRTM-elevation-verified", metricKey: "waterSpan" },
  { href: "/locust", label: "Locust Risk", caption: "3 breeding grounds, real SMAP + Sentinel-2", metricKey: "locustFlagged" },
  { href: "/crop-classifier", label: "Crop / Irrigation", caption: "Irrigated-vs-not, reported below its own baseline", metricKey: "classifierAcc" },
  { href: "/exposure-risk", label: "Exposure Risk", caption: "Hazard x crop calendar, plausibility-filtered", metricKey: "exposurePlausible" },
  { href: "/trigger-engine", label: "Trigger Engine", caption: "Audited contract events, basis risk on every record", metricKey: "triggerCount" },
];

export default function Home() {
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [districtSummary, setDistrictSummary] = useState<DistrictSummary[]>([]);
  const [metrics, setMetrics] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`${BASE}/data/pk_districts.geojson`).then((r) => r.json()).then(setGeo);
    fetch(`${BASE}/data/district_hazard_summary.json`).then((r) => r.json()).then((d) => {
      setDistrictSummary(d.districts);
    });

    Promise.all([
      fetch(`${BASE}/data/water_stress.json`).then((r) => r.json()),
      fetch(`${BASE}/data/locust_risk.json`).then((r) => r.json()),
      fetch(`${BASE}/data/crop_classifier_report.json`).then((r) => r.json()),
      fetch(`${BASE}/data/exposure_risk.json`).then((r) => r.json()),
      fetch(`${BASE}/data/trigger_summary_national.json`).then((r) => r.json()),
    ]).then(([ws, locust, clf, exp, trig]) => {
      setMetrics((prev) => ({
        ...prev,
        waterSpan: `${ws.n_segments} pts / ${ws.flow_direction_check.span_km}km`,
        locustFlagged: `${locust.regions.filter((r: any) => r.breeding_risk_flag).length}/${locust.regions.length} flagged`,
        classifierAcc: `${(clf.models.random_forest.held_out_test_accuracy * 100).toFixed(0)}% (baseline ${(clf.majority_class_baseline_accuracy * 100).toFixed(0)}%)`,
        exposurePlausible: `${(exp.n_nonzero_exposure - exp.n_nonzero_exposure_implausible).toLocaleString()} / ${exp.n_nonzero_exposure.toLocaleString()}`,
        triggerCount: `${trig.n_triggered} events, ${trig.n_triggered_with_real_farms_matched} farm-matched`,
      }));
    });
  }, []);

  useEffect(() => {
    if (!districtSummary.length) return;
    const totalTrig = districtSummary.reduce((s, d) => s + d.n_triggered_rows, 0);
    setMetrics((prev) => ({ ...prev, hazardTriggered: `${totalTrig} triggered rows` }));
  }, [districtSummary]);

  const byName = useMemo(() => {
    const m = new Map<string, DistrictSummary>();
    districtSummary.forEach((d) => m.set(d.district, d));
    return m;
  }, [districtSummary]);

  const maxTriggered = useMemo(
    () => Math.max(1, ...districtSummary.map((d) => d.n_triggered_rows)),
    [districtSummary]
  );

  const totalRows = districtSummary.reduce((s, d) => s + d.n_rows, 0);

  // one neutral-to-accent ramp -- no-data gray, then a single hue from pale to saturated
  const styleFor = (feature: any) => {
    const name = feature.properties?.shapeName as string;
    const d = byName.get(name);
    const n = d?.n_triggered_rows ?? 0;
    const t = n / maxTriggered;
    const color =
      n === 0
        ? "#e8e2d1"
        : t < 0.33
        ? "#bcd9b3"
        : t < 0.66
        ? "#4a8f3c"
        : "#2f5e26";
    return { color: "#8c8878", weight: 0.6, fillColor: color, fillOpacity: 0.9 };
  };

  return (
    <div>
      {/* Full-bleed hero -- the one dominant element on this screen */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
        <div className="graticule relative h-[58vh] min-h-[400px] w-full overflow-hidden bg-app">
          {geo && (
            <div className="absolute inset-0 opacity-80">
              <DistrictChoropleth districtsGeojson={geo} styleFor={styleFor} height="100%" bare interactive={false} />
            </div>
          )}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(9,9,11,0.1) 0%, rgba(9,9,11,0.4) 60%, rgba(9,9,11,0.97) 100%)",
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-6">
            <div className="mx-auto max-w-6xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                National Agriculture Intelligence Platform &middot; Pakistan
              </p>
              <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-main sm:text-4xl">
                From nowcasting to payout.
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-dim">
                Real satellite hazard detection, water accounting, crop intelligence,
                and an audited insurance trigger engine over real Pakistani districts.
              </p>
            </div>
          </div>
        </div>

        {/* quiet data line -- count-up on load, then a slow seamless marquee */}
        {totalRows > 0 && (
          <StatsTicker
            stats={[
              { value: totalRows, label: "real observations" },
              { value: 126, label: "districts" },
              { value: 71, label: "MSG frames" },
              { value: 120, label: "farm polygons" },
              { value: 4, label: "districts with farm coverage" },
            ]}
          />
        )}
      </div>

      <div className="mt-4">
        <PipelineHealthBadge />
      </div>

      <DisclaimerBar>
        This is a visualization layer over real, already-generated project output, not new
        modeling. Every module carries its own real limitations (below-baseline classifier
        accuracy, coarse plausibility masks, proxy geographic boundaries, stubbed payouts)
        surfaced on its own page. See{" "}
        <Link href="/trigger-engine" className="text-accent-500 underline underline-offset-2">
          the trigger engine
        </Link>{" "}
        for the single most important one: a trigger is a reason to investigate, not proof
        of loss.
      </DisclaimerBar>

      {/* quiet, dense module list -- secondary to the map, not competing with it */}
      <div className="mt-2 divide-y divide-[var(--border-soft)] border-b border-soft">
        {MODULES.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-elev/40"
          >
            <div className="min-w-0">
              <h2 className="font-display text-sm font-medium text-main group-hover:text-accent-500">
                {m.label}
              </h2>
              <p className="mt-0.5 truncate text-xs text-faint">{m.caption}</p>
            </div>
            <span className="shrink-0 font-mono text-xs text-dim">
              {metrics[m.metricKey] ?? "..."}
            </span>
          </Link>
        ))}
      </div>

    </div>
  );
}
