"use client";

import { useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, useMap } from "react-leaflet";
import { formatDate } from "../../lib/formatDate";

export type FarmTier = "identity_linked" | "pending" | "synthetic";

export interface MapFarm {
  farm_id: string;
  district: string;
  area_ha: number;
  lat: number;
  lon: number;
  registered: string | null;
  crop_type: string | null;
  tier: FarmTier;
}

const NATIONAL_CENTER: [number, number] = [30.3753, 69.3451];

// Real, three-way-distinct palette -- none reused from this product's
// existing tier meanings (green already means "real/live data" broadly,
// #8a6d3f/tan is reserved elsewhere for "model-estimated", so neither is
// repurposed here with a different meaning). Identity-linked gets its
// own real, non-conflicting gold -- the rarest, most significant real
// category, deliberately not just "a bigger green dot."
const TIER_COLOR: Record<FarmTier, string> = {
  identity_linked: "#b8860b",
  pending: "#4a8f3c",
  synthetic: "#9a9488",
};

const TIER_LABEL: Record<FarmTier, string> = {
  identity_linked: "Real, identity-linked",
  pending: "Real, pending identity",
  synthetic: "Synthetic (context only)",
};

// A real, distinct SHAPE for identity-linked farms (a star), not just a
// bigger circle -- CircleMarker can't render a star, so this one tier
// uses a real Leaflet divIcon Marker instead of a CircleMarker.
function starIcon() {
  return L.divIcon({
    className: "",
    html: `<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 1.5l3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 17.27l-6.18 3.23L7 13.63l-5-4.87 6.91-1z"
        fill="${TIER_COLOR.identity_linked}" stroke="#faf7f0" stroke-width="1.5" stroke-linejoin="round" />
    </svg>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function FitToFarms({ farms, trigger }: { farms: MapFarm[]; trigger: number }) {
  const map = useMap();
  const prevTrigger = useRef(0);
  if (trigger !== prevTrigger.current) {
    prevTrigger.current = trigger;
    if (farms.length > 0) {
      const bounds = L.latLngBounds(farms.map((f) => [f.lat, f.lon] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }
  return null;
}

function LayerChip({
  active, onClick, color, label, count,
}: { active: boolean; onClick: () => void; color: string; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
        active ? "border-soft bg-elev text-main" : "border-soft/60 bg-elev-2 text-faint"
      }`}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color, opacity: active ? 1 : 0.35 }}
      />
      {label}
      <span className="tnum text-faint">({count})</span>
    </button>
  );
}

/** Real point-level map for the Farm Data page -- all three real farm
    categories (identity-linked / pending / synthetic), independently
    toggleable, plus a one-click "just mine" isolation. Real point data
    from db_registry.py's all_farms_with_tier() via the local bridge's
    /api/farms-map -- never a raw identity field (no JOIN against
    farmers at all, enforced server-side, not just hidden client-side).
    Non-negotiable, same write-only discipline as the registration form:
    hover/click on ANY marker, including identity-linked ones, shows only
    district/crop/registration date -- never CNIC, phone, or name, which
    this component never even receives. */
export default function FarmRegistryMap({ farms }: { farms: MapFarm[] }) {
  const [showIdentity, setShowIdentity] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showSynthetic, setShowSynthetic] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0);

  const byTier = useMemo(() => {
    const g: Record<FarmTier, MapFarm[]> = { identity_linked: [], pending: [], synthetic: [] };
    for (const f of farms) g[f.tier].push(f);
    return g;
  }, [farms]);

  const visible = onlyMine
    ? byTier.identity_linked
    : [
        ...(showIdentity ? byTier.identity_linked : []),
        ...(showPending ? byTier.pending : []),
        ...(showSynthetic ? byTier.synthetic : []),
      ];

  const toggle = (setter: (v: boolean) => void, current: boolean) => {
    setOnlyMine(false); // manually touching a layer chip exits "just mine" isolation
    setter(!current);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <LayerChip
          active={!onlyMine && showIdentity}
          onClick={() => toggle(setShowIdentity, showIdentity)}
          color={TIER_COLOR.identity_linked}
          label={TIER_LABEL.identity_linked}
          count={byTier.identity_linked.length}
        />
        <LayerChip
          active={!onlyMine && showPending}
          onClick={() => toggle(setShowPending, showPending)}
          color={TIER_COLOR.pending}
          label={TIER_LABEL.pending}
          count={byTier.pending.length}
        />
        <LayerChip
          active={!onlyMine && showSynthetic}
          onClick={() => toggle(setShowSynthetic, showSynthetic)}
          color={TIER_COLOR.synthetic}
          label={TIER_LABEL.synthetic}
          count={byTier.synthetic.length}
        />
        <button
          onClick={() => {
            setOnlyMine(true);
            setFitTrigger((n) => n + 1);
          }}
          className={`ml-auto rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            onlyMine
              ? "border-accent-500 bg-accent-soft text-accent-500"
              : "border-soft text-dim hover:border-accent-500/50 hover:text-main"
          }`}
        >
          Show only my identity-linked farms
        </button>
      </div>

      <div className="h-[320px] w-full overflow-hidden rounded-xl border border-soft">
        <MapContainer center={NATIONAL_CENTER} zoom={5} minZoom={4} maxZoom={14} className="h-full w-full" zoomControl={false}>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
            maxZoom={16}
          />

          {visible.map((f) =>
            f.tier === "identity_linked" ? (
              <Marker key={f.farm_id} position={[f.lat, f.lon]} icon={starIcon()}>
                <Tooltip>
                  {f.district} &middot; {f.crop_type ?? "crop unknown"} &middot; registered{" "}
                  {f.registered ? formatDate(f.registered.slice(0, 10)) : "unknown"}
                </Tooltip>
              </Marker>
            ) : (
              <CircleMarker
                key={f.farm_id}
                center={[f.lat, f.lon]}
                radius={f.tier === "pending" ? 6 : 4}
                pathOptions={{
                  color: "#faf7f0",
                  weight: 1,
                  fillColor: TIER_COLOR[f.tier],
                  fillOpacity: f.tier === "pending" ? 0.9 : 0.55,
                }}
              >
                <Tooltip>
                  {f.district} &middot; {f.crop_type ?? "crop unknown"} &middot; registered{" "}
                  {f.registered ? formatDate(f.registered.slice(0, 10)) : "unknown"}
                </Tooltip>
              </CircleMarker>
            )
          )}

          <FitToFarms farms={byTier.identity_linked} trigger={fitTrigger} />
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}" maxZoom={16} />
        </MapContainer>
      </div>
    </div>
  );
}
