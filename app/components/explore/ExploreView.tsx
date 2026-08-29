"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ExploreNav from "./ExploreNav";
import type { Crop, LayerId } from "../../explore/layers";
import type { DataBundle } from "../../explore/types";

const ExploreMap = dynamic(() => import("./ExploreMap"), { ssr: false });
const ExplorePanel = dynamic(() => import("./ExplorePanel"), { ssr: false });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

const EMPTY_BUNDLE: DataBundle = {
  hazards: null,
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
  const [triggerThreshold, setTriggerThreshold] = useState<"national" | "demo">("national");

  useEffect(() => {
    fetch(`${BASE}/data/pk_districts.geojson`).then((r) => r.json()).then(setGeo);

    const j = (path: string) => fetch(`${BASE}/data/${path}`).then((r) => r.json());
    Promise.all([
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
      ]) => {
        setData({
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
        });
      }
    );
  }, []);

  const handleSelectLayer = useCallback((id: LayerId) => {
    setActiveLayer(id);
    setSelectedDistrict(null);
  }, []);

  const handleSelectDistrict = useCallback((name: string) => {
    setSelectedDistrict((prev) => (prev === name ? null : name));
  }, []);

  return (
    <div>
      <ExploreNav activeLayer={activeLayer} onSelect={handleSelectLayer} />

      {!geo ? (
        <p className="mt-4 text-sm text-dim">Loading...</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <ExploreMap
            geo={geo}
            layerId={activeLayer}
            data={data}
            cropPick={cropPick}
            triggerThreshold={triggerThreshold}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={handleSelectDistrict}
          />
          <ExplorePanel
            layerId={activeLayer}
            data={data}
            selectedDistrict={selectedDistrict}
            cropPick={cropPick}
            onCropPickChange={setCropPick}
            triggerThreshold={triggerThreshold}
            onTriggerThresholdChange={setTriggerThreshold}
          />
        </div>
      )}
    </div>
  );
}
