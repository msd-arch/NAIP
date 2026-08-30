"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ExploreNav from "./ExploreNav";
import { LAYERS, type Crop, type LayerId } from "../../explore/layers";
import type { DataBundle } from "../../explore/types";

const ExploreMap = dynamic(() => import("./ExploreMap"), { ssr: false });
const ExplorePanel = dynamic(() => import("./ExplorePanel"), { ssr: false });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Real backend cadence: Track H's live_nowcast_cycle.py (a Windows Scheduled
// Task) reprocesses real MSG scenes roughly every 15 minutes and, on every
// cycle, itself calls prepare_data.py to republish the real output files
// this view fetches -- so the files on disk genuinely do change on that
// cadence. This view previously had NO refetch logic at all (a single
// useEffect with an empty dependency array, fetch-once-on-mount) -- a
// real, plain bug: the UI's own copy ("Every 15 minutes the satellite
// pipeline checks...") promises a live cadence the code never delivered
// to an open tab. Polling every 3 minutes here is deliberately *faster*
// than the real 15-min backend cadence (so a real update is never more
// than ~3 real minutes stale once it lands) without hammering local
// static files.
const REFRESH_INTERVAL_MS = 3 * 60 * 1000;

const EMPTY_BUNDLE: DataBundle = {
  hazards: null,
  hazardCurrent: null,
  forecast: null,
  drought: null,
  cropStress: null,
  cropMix: null,
  water: null,
  locust: null,
  flood: null,
  exposure: null,
  triggerNational: null,
  triggerDemo: null,
  triggerSummaryNational: null,
  triggerSummaryDemo: null,
  cropClassifier: null,
  trackF: null,
  crossYear: null,
  yieldResults: null,
  models: null,
  historicalEvents: null,
};

/** The whole product lives on this one screen now: a persistent map + a nav
    bar of "layers" that swap what's drawn on it, instead of separate pages.
    Mounted at both "/" and "/explore" (see those two thin page wrappers). */
export default function ExploreView() {
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [data, setData] = useState<DataBundle>(EMPTY_BUNDLE);
  const [activeLayer, setActiveLayer] = useState<LayerId>("home");
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [cropPick, setCropPick] = useState<Crop>("wheat");
  const [canalPick, setCanalPick] = useState<string>("muridke_distributary");
  const [triggerThreshold, setTriggerThreshold] = useState<"national" | "demo">("national");
  // Hazards page carries two windows (live vs. 72h forecast) instead of the
  // forecast layer being a separate nav item -- this toggle picks which one
  // the map's own choropleth coloring reflects; the panel shows both.
  const [hazardsView, setHazardsView] = useState<"live" | "forecast">("live");
  const [lastRefreshedUtc, setLastRefreshedUtc] = useState<string | null>(null);

  const fetchDataBundle = useCallback(() => {
    // cache: "no-store" -- these are real static JSON files rewritten in
    // place by prepare_data.py every real cycle, same URL each time. A
    // browser (or, in production, GitHub Pages' CDN) can and does cache a
    // plain fetch() of a same-URL static asset -- without this, a refetch
    // could silently return the same stale bytes even though the real file
    // on disk has already changed underneath it.
    const j = (path: string) => fetch(`${BASE}/data/${path}`, { cache: "no-store" }).then((r) => r.json());
    return Promise.all([
      j("district_hazard_summary.json"),
      j("drought_national.json"),
      j("crop_stress_screen.json"),
      j("real_crop_mix.json"),
      j("water_stress.json"),
      j("locust_risk.json"),
      j("track_d_dashboard_summary.json"),
      j("exposure_risk.json"),
      j("audit_log_national.json"),
      j("audit_log_demo.json"),
      j("crop_classifier_report.json"),
      j("track_f_results.json"),
      j("track_j_crossyear_results.json"),
      j("track_o_yield_results.json"),
      j("track_g_dashboard_summary.json"),
      j("trigger_summary_national.json"),
      j("trigger_summary_demo.json"),
      j("forecast_alerts.json"),
      j("historical_events.json"),
      j("district_hazard_current.json"),
    ]).then(
      ([
        hazards,
        drought,
        cropStress,
        cropMix,
        water,
        locust,
        flood,
        exposure,
        triggerNational,
        triggerDemo,
        cropClassifier,
        trackF,
        crossYear,
        yieldResults,
        models,
        triggerSummaryNational,
        triggerSummaryDemo,
        forecast,
        historicalEvents,
        hazardCurrent,
      ]) => {
        setData({
          hazards,
          hazardCurrent,
          forecast,
          drought,
          cropStress,
          cropMix,
          water,
          locust,
          flood,
          exposure,
          triggerNational,
          triggerDemo,
          cropClassifier,
          trackF,
          crossYear,
          yieldResults,
          models,
          triggerSummaryNational,
          triggerSummaryDemo,
          historicalEvents,
        });
        setLastRefreshedUtc(new Date().toISOString());
      }
    );
  }, []);

  useEffect(() => {
    fetch(`${BASE}/data/pk_districts.geojson`).then((r) => r.json()).then(setGeo);
    fetchDataBundle();

    // Real refetch loop -- the actual fix. Re-runs the same real fetch on a
    // fixed interval, and also immediately on tab focus/visibility (so
    // switching back to an already-open tab shows real fresh numbers right
    // away, not up to 3 real minutes later).
    const interval = setInterval(fetchDataBundle, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchDataBundle();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchDataBundle]);

  const handleSelectLayer = useCallback((id: LayerId) => {
    setActiveLayer(id);
    setSelectedDistrict(null);
  }, []);

  const handleSelectDistrict = useCallback((name: string) => {
    setSelectedDistrict((prev) => (prev === name ? null : name));
  }, []);

  // panel-only layers (About, History, Irrigation/CrossYear/Yield, Farm
  // Data) have no real spatial content -- give the panel the FULL width
  // instead of squeezing it into the map layout's fixed 360px column (the
  // real cause of the excessive-scroll complaint on these pages). Every
  // other mode keeps the original map + narrow-panel split.
  const isPanelOnly = LAYERS[activeLayer].mode === "panel-only";

  return (
    <div>
      <ExploreNav activeLayer={activeLayer} onSelect={handleSelectLayer} lastRefreshedUtc={lastRefreshedUtc} />

      {!geo ? (
        <p className="mt-4 text-sm text-dim">Loading...</p>
      ) : isPanelOnly ? (
        <div className="mt-4">
          <ExplorePanel
            layerId={activeLayer}
            data={data}
            selectedDistrict={selectedDistrict}
            cropPick={cropPick}
            onCropPickChange={setCropPick}
            canalPick={canalPick}
            onCanalPickChange={setCanalPick}
            triggerThreshold={triggerThreshold}
            onTriggerThresholdChange={setTriggerThreshold}
            hazardsView={hazardsView}
            onHazardsViewChange={setHazardsView}
          />
        </div>
      ) : (
        // Full-bleed map with the info panel floating as an overlay card on
        // top of it (top-right), instead of the map and panel splitting the
        // page into two fixed side-by-side columns -- a real GIS-app layout,
        // same pattern as the msd-arch Nowcast reference. relative/absolute,
        // not a grid: the map fills the whole real estate, the panel floats
        // above it with its own bounded height and internal scroll.
        <div className="relative mt-4">
          <ExploreMap
            geo={geo}
            layerId={activeLayer}
            data={data}
            cropPick={cropPick}
            canalPick={canalPick}
            triggerThreshold={triggerThreshold}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={handleSelectDistrict}
            hazardsView={hazardsView}
          />
          <div className="themed-scrollbar absolute right-3 top-3 z-[500] max-h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-xl border border-soft bg-elev/95 p-4 shadow-card backdrop-blur-sm sm:w-[380px]">
            <ExplorePanel
              layerId={activeLayer}
              data={data}
              selectedDistrict={selectedDistrict}
              cropPick={cropPick}
              onCropPickChange={setCropPick}
              canalPick={canalPick}
              onCanalPickChange={setCanalPick}
              triggerThreshold={triggerThreshold}
              onTriggerThresholdChange={setTriggerThreshold}
              hazardsView={hazardsView}
              onHazardsViewChange={setHazardsView}
            />
          </div>
        </div>
      )}
    </div>
  );
}
