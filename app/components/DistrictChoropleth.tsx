"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON, ZoomControl } from "react-leaflet";
import type { Feature, Geometry } from "geojson";
import type { Layer, PathOptions } from "leaflet";

export type DistrictFeatureProps = Record<string, unknown> & { shapeName: string };

export default function DistrictChoropleth({
  districtsGeojson,
  styleFor,
  onEachFeature,
  height = "560px",
  bare = false,
  interactive = true,
}: {
  districtsGeojson: GeoJSON.FeatureCollection;
  styleFor: (feature: Feature<Geometry, DistrictFeatureProps>) => PathOptions;
  onEachFeature?: (feature: Feature<Geometry, DistrictFeatureProps>, layer: Layer) => void;
  height?: string;
  /** true = full-bleed hero use: no border/rounding, no zoom UI, no label overlay */
  bare?: boolean;
  interactive?: boolean;
}) {
  return (
    <div style={{ height }} className={bare ? "" : "overflow-hidden rounded-xl border border-soft"}>
      <MapContainer
        center={[30.3753, 69.3451]}
        zoom={5}
        minZoom={4}
        maxZoom={10}
        className="h-full w-full"
        zoomControl={false}
        dragging={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        attributionControl={!bare}
      >
        {!bare && <ZoomControl position="topright" />}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          maxZoom={16}
        />
        <GeoJSON
          data={districtsGeojson as any}
          style={styleFor as any}
          onEachFeature={onEachFeature as any}
        />
        {!bare && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
          />
        )}
      </MapContainer>
    </div>
  );
}
