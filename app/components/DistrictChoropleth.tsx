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
}: {
  districtsGeojson: GeoJSON.FeatureCollection;
  styleFor: (feature: Feature<Geometry, DistrictFeatureProps>) => PathOptions;
  onEachFeature?: (feature: Feature<Geometry, DistrictFeatureProps>, layer: Layer) => void;
  height?: string;
}) {
  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-soft">
      <MapContainer
        center={[30.3753, 69.3451]}
        zoom={5}
        minZoom={4}
        maxZoom={10}
        className="h-full w-full"
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors'
          subdomains="abcd"
          maxZoom={19}
        />
        <GeoJSON
          data={districtsGeojson as any}
          style={styleFor as any}
          onEachFeature={onEachFeature as any}
        />
      </MapContainer>
    </div>
  );
}
