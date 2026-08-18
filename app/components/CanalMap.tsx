"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline } from "react-leaflet";

interface Segment {
  segment_id: number; dist_from_head_km: number; position: string;
  lat: number; lon: number; stress_index: number | null;
}

function stressColor(v: number | null) {
  if (v === null) return "#4a5878";
  // 0.85-0.95 is this canal's real observed range -- stretch that band for visible contrast
  const t = Math.min(1, Math.max(0, (v - 0.82) / 0.15));
  return `rgb(${Math.round(80 + t * 175)}, ${Math.round(180 - t * 140)}, 90)`;
}

export default function CanalMap({ segments }: { segments: Segment[] }) {
  const center: [number, number] = [segments[Math.floor(segments.length / 2)].lat, segments[Math.floor(segments.length / 2)].lon];
  const line = segments.map((s) => [s.lat, s.lon] as [number, number]);

  return (
    <div style={{ height: "360px" }} className="overflow-hidden rounded-xl border border-soft">
      <MapContainer center={center} zoom={9} className="h-full w-full" zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO &copy; OpenStreetMap'
          subdomains="abcd"
          maxZoom={19}
        />
        <Polyline positions={line} color="#4da3ff55" weight={2} />
        {segments.map((s) => (
          <CircleMarker
            key={s.segment_id}
            center={[s.lat, s.lon]}
            radius={s.position === "head" || s.position === "tail" ? 8 : 5}
            pathOptions={{ color: "#0b0f16", weight: 1, fillColor: stressColor(s.stress_index), fillOpacity: 0.9 }}
          >
            <Tooltip>
              {s.position} &middot; {s.dist_from_head_km}km &middot; stress={s.stress_index ?? "n/a"}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
