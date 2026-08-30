// Real, static agronomic reference text per hazard type -- what each one
// physically means and why it matters for farming, not just the raw label.
// Written from this project's own real detector definitions (hazards.py's
// 11 detectors + the real residue-burning classifier), not per-alert data.
// Shared between ExplorePanel.tsx (Live/Forecast windows) and the hazard
// animation popup so the two never drift apart with duplicated copies.
export const HAZARD_INFO: Record<string, string> = {
  frost: "Crop-surface temperature drops to/below freezing overnight under clear, calm skies. Can damage or kill flowering fruit trees, vegetables, and young Rabi-season growth. Response: irrigate before a frost night (wet soil holds heat overnight).",
  heat_wave: "Sustained unusually high temperatures over multiple days. Stresses crops during flowering/grain-fill (can abort flowers, reduce grain weight), raises irrigation demand and livestock heat stress.",
  cold_wave: "Sustained unusually low temperatures (not necessarily freezing) over multiple days. Slows growth and germination, raises livestock cold stress and fodder demand.",
  hail: "Ice pellets from a severe thunderstorm updraft. Can shred leaves, strip fruit/flowers, and flatten standing wheat or cotton in minutes — one of the fastest-acting real crop-damage hazards here.",
  thunderstorm: "Severe convective storm — strong updrafts, lightning, gusty wind, heavy rain. Risk of crop lodging, structural damage, and danger to outdoor field work/livestock.",
  fog: "Near-surface cloud cutting visibility, common in winter over the Indus plains. Reduces sunlight reaching crops, delays spraying/harvesting, and is a real road-safety hazard for moving produce.",
  dust_storm: "Strong wind lifting soil/sand, common pre-monsoon and in arid regions. Can bury young seedlings and damage flowering crops; also cuts visibility for field work and transport.",
  cloud_burst: "Extremely intense, localized rain from explosive vertical cloud growth in a short window. Real flash-flood risk to low-lying fields — can cause severe waterlogging in minutes.",
  heavy_rain: "Sustained intense rainfall. Risk of waterlogging, root damage, and delayed field access/harvest; can compound with the separate national flood-risk screen.",
  uv_index: "Elevated surface UV under clear, high-solar-elevation conditions. Mainly an outdoor-labour safety signal (sunburn/heat exposure for field workers), not a direct crop-damage hazard.",
  residue_burning: "Real thermal hotspots consistent with post-harvest crop-residue burning. A land-management/air-quality signal (smoke, regional haze) rather than a threat to the burning farmer's own current crop.",
};

export const HAZARD_LABEL: Record<string, string> = {
  frost: "Frost", heat_wave: "Heat wave", cold_wave: "Cold wave", hail: "Hail",
  thunderstorm: "Thunderstorm", fog: "Fog", dust_storm: "Dust storm",
  cloud_burst: "Cloud burst", heavy_rain: "Heavy rain", uv_index: "UV index",
  residue_burning: "Residue burning",
};
