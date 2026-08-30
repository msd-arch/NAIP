"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { formatDate } from "../../lib/formatDate";

export interface RegisteredFarm {
  farm_id: string;
  district: string;
  area_ha: number;
  lat: number;
  lon: number;
  registered: string;
}

const NATIONAL_CENTER: [number, number] = [30.3753, 69.3451];

/** Small embedded map for the Farm Data page -- real registered-farm
    locations only (registered_farms(): is_synthetic=false AND farmer_id IS
    NOT NULL), never a raw identity field. A standalone MapContainer, not
    the shared ExploreMap, since this page's data comes from the local
    submission_server bridge, not the DataBundle every other layer shares. */
export default function FarmRegistryMap({ farms }: { farms: RegisteredFarm[] }) {
  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-soft">
      <MapContainer center={NATIONAL_CENTER} zoom={5} minZoom={4} maxZoom={12} className="h-full w-full" zoomControl={false}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          maxZoom={16}
        />
        {farms.map((f) => (
          <CircleMarker key={f.farm_id} center={[f.lat, f.lon]} radius={6} pathOptions={{ color: "#faf7f0", weight: 1, fillColor: "#4a8f3c", fillOpacity: 0.9 }}>
            <Tooltip>
              {f.district} &middot; {f.area_ha.toFixed(2)} ha &middot; registered {formatDate(f.registered.slice(0, 10))}
            </Tooltip>
          </CircleMarker>
        ))}
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}" maxZoom={16} />
      </MapContainer>
    </div>
  );
}
