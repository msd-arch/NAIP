"use client";

import { MapContainer, GeoJSON, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LayerId } from "../../explore/layers";
import type { DataBundle } from "../../explore/types";
import type { MapFarm } from "./FarmRegistryMap";
import {
  styleForDistrict,
  stressColor,
  NATIONAL_CENTER,
  CHOLISTAN_PROXY,
  LOCUST_REAL_BOUNDARY,
} from "./ExploreMap";

/** One small, real, non-interactive Leaflet preview -- reuses the exact
    real coloring functions ExploreMap.tsx uses for the full page (imported
    directly, not reimplemented), just mounted small with every interaction
    handler disabled and no raster TileLayer (see HomeMapTiles.tsx for the
    real, measured reasoning). Clicking anywhere in the tile is handled by
    the parent <button>, not by the map itself. */

const NONINTERACTIVE = {
  dragging: false,
  zoomControl: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  touchZoom: false,
  boxZoom: false,
  keyboard: false,
  attributionControl: false,
} as const;

const TIER_DOT_COLOR: Record<string, string> = {
  identity_linked: "#b8860b",
  pending: "#4a8f3c",
  synthetic: "#9a9488",
};

export default function MiniLeafletTile({
  layerId,
  geo,
  data,
  farms,
}: {
  layerId: LayerId;
  geo: GeoJSON.FeatureCollection | null;
  data: DataBundle;
  farms: MapFarm[];
}) {
  if (!geo) return null;

  if (layerId === "locust") {
    const locustGeo = {
      ...geo,
      features: geo.features.filter(
        (f: any) => LOCUST_REAL_BOUNDARY.has(f.properties.shapeName) || CHOLISTAN_PROXY.has(f.properties.shapeName)
      ),
    };
    return (
      <MapContainer center={[26.5, 68.5]} zoom={4} {...NONINTERACTIVE} className="h-full w-full pointer-events-none">
        <GeoJSON
          data={locustGeo as any}
          style={(feature: any) => {
            const name = feature.properties?.shapeName;
            if (CHOLISTAN_PROXY.has(name)) return { color: "#b5651d", weight: 1, dashArray: "4 3", fillColor: "#b5651d", fillOpacity: 0.18 };
            return { color: "#4a8f3c", weight: 1, fillColor: "#4a8f3c", fillOpacity: 0.3 };
          }}
        />
      </MapContainer>
    );
  }

  if (layerId === "canal") {
    const canals = data.water?.canals ?? [];
    return (
      <MapContainer center={NATIONAL_CENTER} zoom={4} {...NONINTERACTIVE} className="h-full w-full pointer-events-none">
        <GeoJSON data={geo as any} style={() => ({ color: "#c8c0aa", weight: 0.5, fillColor: "#efe9db", fillOpacity: 0.4 })} />
        {canals.map((c) => {
          const tail = c.segments.find((s) => s.position === "tail") ?? c.segments[c.segments.length - 1];
          if (!tail) return null;
          return (
            <CircleMarker
              key={c.canal_id}
              center={[tail.lat, tail.lon]}
              radius={5}
              pathOptions={{ color: "#faf7f0", weight: 1, fillColor: stressColor(tail.stress_index), fillOpacity: 0.95 }}
            />
          );
        })}
      </MapContainer>
    );
  }

  if (layerId === "register") {
    return (
      <MapContainer center={NATIONAL_CENTER} zoom={4} {...NONINTERACTIVE} className="h-full w-full pointer-events-none">
        <GeoJSON data={geo as any} style={() => ({ color: "#c8c0aa", weight: 0.5, fillColor: "#efe9db", fillOpacity: 0.4 })} />
        {farms.slice(0, 300).map((f) => (
          <CircleMarker
            key={f.farm_id}
            center={[f.lat, f.lon]}
            radius={f.tier === "identity_linked" ? 3 : 1.6}
            pathOptions={{ color: "none", fillColor: TIER_DOT_COLOR[f.tier] ?? "#9a9488", fillOpacity: 0.85 }}
          />
        ))}
      </MapContainer>
    );
  }

  // hazards / cropstress / flood / drought / home / etc -- national
  // choropleth, real styleForDistrict() coloring, same function the full
  // page uses.
  return (
    <MapContainer center={NATIONAL_CENTER} zoom={4} {...NONINTERACTIVE} className="h-full w-full pointer-events-none">
      <GeoJSON
        data={geo as any}
        style={(feature: any) => {
          const name = feature.properties?.shapeName;
          const s = styleForDistrict(name, layerId, data, "wheat", "national", "live");
          return { color: "#faf7f088", weight: 0.4, fillColor: s.fillColor, fillOpacity: s.fillOpacity };
        }}
      />
    </MapContainer>
  );
}
