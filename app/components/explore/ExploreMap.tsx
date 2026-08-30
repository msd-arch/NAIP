"use client";

import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { Feature, Geometry } from "geojson";
import type { Crop, LayerId } from "../../explore/layers";
import { LAYERS } from "../../explore/layers";
import type { DataBundle } from "../../explore/types";
import { formatDate } from "../../lib/formatDate";

const NATIONAL_CENTER: [number, number] = [30.3753, 69.3451];
const NATIONAL_ZOOM = 5;
const LOCUST_CENTER: [number, number] = [26.5, 68.5];
const LOCUST_ZOOM = 6;

const CHOLISTAN_PROXY = new Set(["Bahawalpur", "Bahawalnagar", "Rahim Yar Khan"]);
const LOCUST_REAL_BOUNDARY = new Set(["Tharparkar", "Kharan"]);

const NODATA = "#e8e2d1";
const STEP1 = "#bcd9b3";
const STEP2 = "#4a8f3c";
const STEP3 = "#2f5e26";
const TIER_COLOR: Record<string, string> = {
  real_district_area: "#4a8f3c",
  model_estimated_interim: "#8a6d3f",
  model_predicted: "#8a6d3f",
  hand_classified_mask: "#8a8578",
};
const CRITICAL = "#c93b35";

interface DistrictStyleResult {
  fillColor: string;
  fillOpacity: number;
  tooltip: string;
}

const EMPTY: DistrictStyleResult = { fillColor: NODATA, fillOpacity: 0.55, tooltip: "no data" };

function styleForDistrict(
  name: string,
  layerId: LayerId,
  data: DataBundle,
  cropPick: Crop,
  triggerThreshold: "national" | "demo",
  hazardsView: "live" | "forecast" = "live"
): DistrictStyleResult {
  if (layerId === "hazards" && hazardsView === "forecast") {
    const rows = (data.forecast?.alerts ?? []).filter((a) => a.district === name && a.flag);
    if (rows.length === 0) return { fillColor: NODATA, fillOpacity: 0.35, tooltip: `${name}: no forecast flag in the next 72h` };
    const hazards = [...new Set(rows.map((r) => r.forecast_hazard))].join(", ");
    return { fillColor: "#8a6d3f", fillOpacity: Math.min(0.9, 0.4 + rows.length * 0.12), tooltip: `${name}: ${hazards} forecast in the next 72h` };
  }
  if (layerId === "hazards") {
    // Live window: real CURRENT status (most recent real check per hazard),
    // not a cumulative lifetime total -- see prepare_data.py's own comment
    // on district_hazard_current.json for the real user-reported confusion
    // this replaced (a lifetime count that never read as "right now").
    const rows = data.hazardCurrent?.districts ?? [];
    const row = rows.find((d) => d.district === name);
    const n = row?.n_currently_flagged ?? 0;
    const fillColor = n === 0 ? NODATA : n === 1 ? STEP1 : n === 2 ? STEP2 : STEP3;
    return {
      fillColor, fillOpacity: n === 0 ? 0.55 : 0.92,
      tooltip: n === 0
        ? `${name}: no hazard currently flagged (as of ${formatDate(row?.most_recent_check_date)})`
        : `${name}: ${n} hazard${n === 1 ? "" : "s"} currently flagged (as of ${formatDate(row?.most_recent_check_date)})`,
    };
  }
  if (layerId === "home") {
    const rows = data.hazards?.districts ?? [];
    const row = rows.find((d) => d.district === name);
    const max = Math.max(1, ...rows.map((d) => d.n_triggered_rows));
    const n = row?.n_triggered_rows ?? 0;
    const t = n / max;
    const fillColor = n === 0 ? NODATA : t < 0.33 ? STEP1 : t < 0.66 ? STEP2 : STEP3;
    return { fillColor, fillOpacity: n === 0 ? 0.55 : 0.92, tooltip: `${name}: ${n} real triggered hazard rows in the archive (cumulative)` };
  }
  if (layerId === "cropstress") {
    const row = data.cropStress?.district_results.find((d) => d.district === name);
    if (!row) return { ...EMPTY, tooltip: `${name}: not covered` };
    const fillColor = row.district_flag_both_signals ? STEP3 : row.district_flag_either_signal ? STEP1 : NODATA;
    return { fillColor, fillOpacity: row.district_flag_both_signals || row.district_flag_either_signal ? 0.9 : 0.5, tooltip: `${name}: both signs ${row.n_points_both_signals}, either sign ${Math.max(row.n_points_level_anomaly, row.n_points_senescence_anomaly)}` };
  }
  if (layerId === "drought") {
    const row = data.drought?.district_results.find((d) => d.district === name);
    if (!row) return { ...EMPTY, tooltip: `${name}: not covered` };
    return {
      fillColor: row.district_flag ? STEP3 : NODATA,
      fillOpacity: row.district_flag ? 0.92 : 0.5,
      tooltip: `${name}: z-score ${row.mean_z_score.toFixed(2)}${row.district_flag ? " — flagged drier than usual" : ""}`,
    };
  }
  if (layerId === "flood") {
    const row = data.flood?.district_results.find((d) => d.district === name);
    if (!row || row.mean_model_score == null) return { ...EMPTY, tooltip: `${name}: no score` };
    const s = row.mean_model_score;
    const fillColor = s < 0.3 ? NODATA : s < 0.5 ? STEP1 : s < 0.7 ? STEP2 : STEP3;
    return { fillColor, fillOpacity: 0.6 + s * 0.35, tooltip: `${name}: flood score ${s.toFixed(3)}${row.flag ? " (flagged)" : ""}` };
  }
  if (layerId === "cropmodel") {
    const entry = data.cropMix?.[name];
    const crop = entry?.crops?.[cropPick];
    if (!entry || !crop) return { ...EMPTY, tooltip: `${name}: no crop-mix data` };
    const share = crop.share_of_4crop_area;
    const tierColor = TIER_COLOR[entry.tier] ?? "#8a8578";
    return {
      fillColor: share > 0 ? tierColor : NODATA,
      fillOpacity: share > 0 ? Math.min(0.95, 0.2 + share * 0.85) : 0.35,
      tooltip: `${name}: ${cropPick} ${(share * 100).toFixed(1)}% of farmland (${entry.tier.replace(/_/g, " ")})`,
    };
  }
  if (layerId === "exposure") {
    const rows = (data.exposure?.top_exposure_events ?? []).filter((e) => e.district === name);
    if (rows.length === 0) return { fillColor: NODATA, fillOpacity: 0.3, tooltip: `${name}: not in the top-50 scored events` };
    const best = rows.reduce((a, b) => (b.exposure_score > a.exposure_score ? b : a));
    const tierColor = TIER_COLOR[best.crop_mix_source ?? ""] ?? "#8a6d3f";
    const maxScore = Math.max(...(data.exposure?.top_exposure_events ?? []).map((e) => e.exposure_score), 0.001);
    return {
      fillColor: tierColor,
      fillOpacity: Math.min(0.95, 0.3 + (best.exposure_score / maxScore) * 0.65),
      tooltip: `${name}: ${best.hazard.replace(/_/g, " ")} × ${best.crop}, score ${best.exposure_score}`,
    };
  }
  if (layerId === "trigger") {
    const records = (triggerThreshold === "national" ? data.triggerNational : data.triggerDemo) ?? [];
    const rows = records.filter((r) => r.district === name);
    if (rows.length === 0) return { fillColor: NODATA, fillOpacity: 0.3, tooltip: `${name}: no trigger fired` };
    return { fillColor: CRITICAL, fillOpacity: 0.85, tooltip: `${name}: ${rows.length} trigger event${rows.length === 1 ? "" : "s"} fired` };
  }
  if (layerId === "forecast") {
    const rows = (data.forecast?.alerts ?? []).filter((a) => a.district === name && a.flag);
    if (rows.length === 0) return { fillColor: NODATA, fillOpacity: 0.35, tooltip: `${name}: no forecast flag in the next 72h` };
    // secondary (brown/tan) accent, deliberately not the live-hazard green ramp --
    // a forecast is a prediction, never a confirmed observation, same visual
    // vocabulary this product already uses for "model-estimated, not real/confirmed"
    const hazards = [...new Set(rows.map((r) => r.forecast_hazard))].join(", ");
    return { fillColor: "#8a6d3f", fillOpacity: Math.min(0.9, 0.4 + rows.length * 0.12), tooltip: `${name}: ${hazards} forecast in the next 72h` };
  }
  return EMPTY;
}

function FlyAndSize({ layerId, canalCenter }: { layerId: LayerId; canalCenter: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    const mode = LAYERS[layerId].mode;
    if (mode === "zoom-locust") {
      map.flyTo(LOCUST_CENTER, LOCUST_ZOOM, { duration: 0.9 });
    } else if (mode === "zoom-canal" && canalCenter) {
      map.flyTo(canalCenter, 9, { duration: 0.9 });
    } else {
      map.flyTo(NATIONAL_CENTER, NATIONAL_ZOOM, { duration: 0.9 });
    }
    const t = setTimeout(() => map.invalidateSize({ animate: true }), 520);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerId, canalCenter, map]);
  return null;
}

function stressColor(v: number | null) {
  if (v === null) return "#b0aa95";
  const t = Math.min(1, Math.max(0, (v - 0.82) / 0.15));
  const stops: [number, number, number][] = [
    [143, 199, 138],
    [74, 143, 60],
    [47, 94, 38],
  ];
  const seg = t < 0.5 ? [stops[0], stops[1], t * 2] : [stops[1], stops[2], (t - 0.5) * 2];
  const [a, b, lt] = seg as [number[], number[], number];
  const mix = (i: number) => Math.round(a[i] + (b[i] - a[i]) * lt);
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}

export default function ExploreMap({
  geo,
  layerId,
  data,
  cropPick,
  triggerThreshold,
  selectedDistrict,
  onSelectDistrict,
  hazardsView = "live",
}: {
  geo: GeoJSON.FeatureCollection;
  layerId: LayerId;
  data: DataBundle;
  cropPick: Crop;
  triggerThreshold: "national" | "demo";
  selectedDistrict: string | null;
  onSelectDistrict: (name: string) => void;
  hazardsView?: "live" | "forecast";
}) {
  const geoJsonRef = useRef<any>(null);
  const selectRef = useRef(onSelectDistrict);
  useEffect(() => {
    selectRef.current = onSelectDistrict;
  }, [onSelectDistrict]);

  const mode = LAYERS[layerId].mode;
  const isChoropleth = mode === "choropleth";

  const canalCenter = useMemo<[number, number] | null>(() => {
    const segs = data.water?.segments;
    if (!segs || segs.length === 0) return null;
    const mid = segs[Math.floor(segs.length / 2)];
    return [mid.lat, mid.lon];
  }, [data.water]);

  // reapply style + tooltip imperatively whenever the active layer/data/selection
  // changes -- the GeoJSON's `data` prop identity never changes, so Leaflet never
  // recreates the layer, it's only restyled (no flicker, no reinit).
  useEffect(() => {
    const gj = geoJsonRef.current;
    if (!gj) return;
    const dim = !isChoropleth;
    gj.eachLayer((layer: any) => {
      const feature = layer.feature as Feature<Geometry, any>;
      const name = feature.properties?.shapeName as string;
      const s = isChoropleth
        ? styleForDistrict(name, layerId, data, cropPick, triggerThreshold, hazardsView)
        : EMPTY;
      const selected = name === selectedDistrict;
      layer.setStyle({
        color: selected ? "#2b2a24" : "#8c8878",
        weight: selected ? 2.5 : 1,
        fillColor: s.fillColor,
        fillOpacity: dim ? Math.min(0.12, s.fillOpacity) : s.fillOpacity,
      });
      layer.unbindTooltip();
      layer.bindTooltip(s.tooltip, { sticky: true });
    });
  }, [layerId, data, cropPick, triggerThreshold, selectedDistrict, isChoropleth, hazardsView]);

  const onEachFeature = useMemo(
    () => (feature: Feature<Geometry, any>, layer: any) => {
      layer.on("click", () => selectRef.current(feature.properties?.shapeName));
    },
    []
  );

  const locustGeo = useMemo(
    () => ({
      ...geo,
      features: geo.features.filter(
        (f: any) => LOCUST_REAL_BOUNDARY.has(f.properties.shapeName) || CHOLISTAN_PROXY.has(f.properties.shapeName)
      ),
    }),
    [geo]
  );

  return (
    // Full-bleed: this component is now only ever rendered for real
    // spatial layers (ExploreView.tsx keeps panel-only layers on a
    // map-free, full-width panel instead), so it always takes the tall,
    // near-full-viewport height -- the info panel floats as an overlay
    // card on top of it, not a fixed side column that used to shrink the
    // map to make room.
    <div className="isolate relative z-0 h-[calc(100vh-160px)] min-h-[520px] overflow-hidden rounded-xl border border-soft">
      <MapContainer
        center={NATIONAL_CENTER}
        zoom={NATIONAL_ZOOM}
        minZoom={4}
        maxZoom={11}
        className="h-full w-full"
        zoomControl={false}
        attributionControl
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          maxZoom={16}
        />

        <GeoJSON ref={geoJsonRef as any} data={geo as any} style={() => ({ color: "#8c8878", weight: 1, fillColor: NODATA, fillOpacity: 0.5 })} onEachFeature={onEachFeature as any} />

        {mode === "zoom-locust" && (
          <GeoJSON
            data={locustGeo as any}
            style={(feature: any) => {
              const name = feature.properties?.shapeName;
              if (CHOLISTAN_PROXY.has(name)) {
                return { color: "#b5651d", weight: 2, dashArray: "6 4", fillColor: "#b5651d", fillOpacity: 0.14 };
              }
              return { color: "#4a8f3c", weight: 2, fillColor: "#4a8f3c", fillOpacity: 0.24 };
            }}
            onEachFeature={(feature: any, layer: any) => {
              const name = feature.properties.shapeName;
              const isProxy = CHOLISTAN_PROXY.has(name);
              layer.bindTooltip(
                isProxy
                  ? `${name} (part of the Cholistan PROXY boundary — no official boundary exists)`
                  : `${name} (real district boundary)`,
                { sticky: true }
              );
            }}
          />
        )}

        {mode === "zoom-canal" && data.water && (
          <>
            <Polyline positions={data.water.segments.map((s) => [s.lat, s.lon] as [number, number])} color="#4a8f3c88" weight={2} />
            {data.water.segments.map((s) => (
              <CircleMarker
                key={s.segment_id}
                center={[s.lat, s.lon]}
                radius={s.position === "head" || s.position === "tail" ? 8 : 5}
                pathOptions={{ color: "#faf7f0", weight: 1, fillColor: stressColor(s.stress_index), fillOpacity: 0.9 }}
              >
                <Tooltip>
                  {s.position} &middot; {s.dist_from_head_km}km &middot; stress={s.stress_index ?? "n/a"}
                </Tooltip>
              </CircleMarker>
            ))}
          </>
        )}

        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />

        <FlyAndSize layerId={layerId} canalCenter={canalCenter} />
      </MapContainer>
    </div>
  );
}
