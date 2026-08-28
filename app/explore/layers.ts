export type LayerId =
  | "home"
  | "hazards"
  | "locust"
  | "cropstress"
  | "canal"
  | "flood"
  | "drought"
  | "cropmodel"
  | "irrigation"
  | "crossyear"
  | "yield"
  | "exposure"
  | "trigger"
  | "models";

export type LayerMode = "choropleth" | "zoom-locust" | "zoom-canal" | "panel-only";

export interface LayerMeta {
  id: LayerId;
  group: string;
  label: string;
  mode: LayerMode;
  about: string;
}

export const LAYERS: Record<LayerId, LayerMeta> = {
  home: {
    id: "home",
    group: "",
    label: "Home",
    mode: "choropleth",
    about:
      "National Agriculture Intelligence Platform — using satellites to spot weather hazards, track water and crops, and decide when a farmer might deserve a payout, across Pakistan.",
  },
  hazards: {
    id: "hazards",
    group: "Hazard Monitoring",
    label: "National Hazards",
    mode: "choropleth",
    about:
      "Every 15 minutes the satellite pipeline checks all 126 districts for 11 hazard types — frost, heat wave, hail, fog, dust storms and more. Darker districts have more active alerts right now.",
  },
  locust: {
    id: "locust",
    group: "Hazard Monitoring",
    label: "Locust Risk",
    mode: "zoom-locust",
    about:
      "Desert locust breeding needs damp soil and fresh green-up. This zooms into Tharparkar, Kharan and the Cholistan proxy area — the only regions arid enough to matter — and checks both conditions from satellite.",
  },
  cropstress: {
    id: "cropstress",
    group: "Hazard Monitoring",
    label: "Crop Stress Screen",
    mode: "choropleth",
    about:
      "Not a diagnosis — a screen. Flags districts where vegetation looks unusually low, or is declining faster than normal for this time of year, worth a closer look.",
  },
  canal: {
    id: "canal",
    group: "Water & Climate",
    label: "Canal Water Stress",
    mode: "zoom-canal",
    about:
      "Water in a canal gets used up as it travels, so the far end usually gets less than the start. This zooms into the Muridke Distributary and tracks that head-to-tail difference.",
  },
  flood: {
    id: "flood",
    group: "Water & Climate",
    label: "Flood Risk Screen",
    mode: "choropleth",
    about:
      "Checks live satellite radar, water maps, and rainfall data to screen for raised flood risk. An early-warning signal, not a confirmed flood alert.",
  },
  drought: {
    id: "drought",
    group: "Water & Climate",
    label: "National Drought Signal",
    mode: "choropleth",
    about:
      "Compares this month's vegetation against each district's own multi-year satellite history. Flags places running drier than their own normal, not just drier than their neighbors.",
  },
  cropmodel: {
    id: "cropmodel",
    group: "Crop Intelligence",
    label: "National Crop Model",
    mode: "choropleth",
    about:
      "Estimated share of farmland growing wheat, cotton, rice or sugarcane per district. Government-reported where available, model-estimated for newer seasons, or a hand-reviewed fallback for the 11 districts with no official data.",
  },
  irrigation: {
    id: "irrigation",
    group: "Crop Intelligence",
    label: "Irrigation Classifier",
    mode: "panel-only",
    about:
      "Guesses whether a farm is irrigated by how green it looks in satellite images over the season. Not spatial at district scale, so the map steps back here.",
  },
  crossyear: {
    id: "crossyear",
    group: "Crop Intelligence",
    label: "Cross-Year Validation",
    mode: "panel-only",
    about:
      "Trained on one year's real data, tested on another, to see if the crop model still works on a year it hasn't seen before. Not spatial, so the map steps back here.",
  },
  yield: {
    id: "yield",
    group: "Crop Intelligence",
    label: "Yield Prediction",
    mode: "panel-only",
    about:
      "Tried predicting how much each district would harvest per hectare. Simply assuming this year matches last year usually beats the model — a real, honest finding. Not spatial, so the map steps back here.",
  },
  exposure: {
    id: "exposure",
    group: "Insurance Engine",
    label: "Exposure Risk",
    mode: "choropleth",
    about:
      "Where a live hazard overlaps a crop in its vulnerable growth stage. Only the top 50 events are scored, covering a subset of districts — the rest aren't ruled safe, they're just not in this list yet.",
  },
  trigger: {
    id: "trigger",
    group: "Insurance Engine",
    label: "Trigger Engine",
    mode: "choropleth",
    about:
      "Districts where an exposure event actually crossed the payout threshold. Every record carries its basis-risk note — a trigger measures the index, not any individual farmer's real loss.",
  },
  models: {
    id: "models",
    group: "",
    label: "About",
    mode: "panel-only",
    about:
      "What this product is, and the trained models running in it — each shown next to the rule-based or naive baseline it had to beat. Not spatial, so the map steps back here.",
  },
};

export interface LayerGroup {
  label: string;
  layers: LayerId[];
  /** true = render as a single plain nav button, not a dropdown. Requires exactly one layer. */
  standalone?: boolean;
}

export const LAYER_GROUPS: LayerGroup[] = [
  { label: "Home", layers: ["home"], standalone: true },
  { label: "Hazard Monitoring", layers: ["hazards", "locust", "cropstress"] },
  { label: "Water & Climate", layers: ["canal", "flood", "drought"] },
  { label: "Crop Intelligence", layers: ["cropmodel", "irrigation", "crossyear", "yield"] },
  { label: "Insurance Engine", layers: ["exposure", "trigger"] },
  { label: "About", layers: ["models"], standalone: true },
];

export const CROPS = ["wheat", "cotton", "rice", "sugarcane"] as const;
export type Crop = (typeof CROPS)[number];
