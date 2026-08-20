"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON, Tooltip } from "react-leaflet";
import type { Feature, Geometry } from "geojson";

const CHOLISTAN_PROXY_DISTRICTS = new Set(["Bahawalpur", "Bahawalnagar", "Rahim Yar Khan"]);
const REAL_BOUNDARY_DISTRICTS = new Set(["Tharparkar", "Kharan"]);

export default function LocustMap({ districtsGeojson }: { districtsGeojson: GeoJSON.FeatureCollection }) {
  const relevant = {
    ...districtsGeojson,
    features: districtsGeojson.features.filter((f: any) =>
      REAL_BOUNDARY_DISTRICTS.has(f.properties.shapeName) || CHOLISTAN_PROXY_DISTRICTS.has(f.properties.shapeName)
    ),
  };

  const styleFor = (feature: Feature<Geometry, any>) => {
    const name = feature.properties?.shapeName as string;
    if (CHOLISTAN_PROXY_DISTRICTS.has(name)) {
      // the one sanctioned warning-amber, same tone as the caveat banner --
      // a boundary-uncertainty flag, not a category color
      return { color: "#d99b3c", weight: 2, dashArray: "6 4", fillColor: "#d99b3c", fillOpacity: 0.12 };
    }
    return { color: "#4fb8ad", weight: 2, fillColor: "#4fb8ad", fillOpacity: 0.22 };
  };

  return (
    <div style={{ height: "420px" }} className="overflow-hidden rounded-xl border border-soft">
      <MapContainer center={[26.5, 68.5]} zoom={6} className="h-full w-full" zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO &copy; OpenStreetMap'
          subdomains="abcd"
          maxZoom={19}
        />
        <GeoJSON
          data={relevant as any}
          style={styleFor as any}
          onEachFeature={(feature: any, layer: any) => {
            const name = feature.properties.shapeName;
            const isProxy = CHOLISTAN_PROXY_DISTRICTS.has(name);
            layer.bindTooltip(
              isProxy
                ? `${name} (part of the Cholistan PROXY boundary -- no official Cholistan Desert boundary exists)`
                : `${name} (real district boundary)`,
              { sticky: true }
            );
          }}
        />
      </MapContainer>
    </div>
  );
}
