"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline } from "react-leaflet";

interface Segment {
  segment_id: number; dist_from_head_km: number; position: string;
  lat: number; lon: number; stress_index: number | null;
}

function stressColor(v: number | null) {
  if (v === null) return "#b0aa95";
  // 0.85-0.95 is this canal's real observed range -- stretch that band for visible
  // contrast, within the one accent hue only (pale tint -> saturated accent-700)
  const t = Math.min(1, Math.max(0, (v - 0.82) / 0.15));
  const stops: [number, number, number][] = [
    [143, 199, 138], // accent-300, low stress
    [74, 143, 60],   // accent-500
    [47, 94, 38],    // accent-700, most severe
  ];
  const seg = t < 0.5 ? [stops[0], stops[1], t * 2] : [stops[1], stops[2], (t - 0.5) * 2];
  const [a, b, lt] = seg as [number[], number[], number];
  const mix = (i: number) => Math.round(a[i] + (b[i] - a[i]) * lt);
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}

export default function CanalMap({ segments }: { segments: Segment[] }) {
  const center: [number, number] = [segments[Math.floor(segments.length / 2)].lat, segments[Math.floor(segments.length / 2)].lon];
  const line = segments.map((s) => [s.lat, s.lon] as [number, number]);

  return (
    <div style={{ height: "360px" }} className="overflow-hidden rounded-xl border border-soft">
      <MapContainer center={center} zoom={9} className="h-full w-full" zoomControl={false}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          maxZoom={16}
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />
        <Polyline positions={line} color="#4a8f3c88" weight={2} />
        {segments.map((s) => (
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
      </MapContainer>
    </div>
  );
}
