// Shared shapes for the data this view fetches, matching each real page's own
// interfaces (hazards/page.tsx, water-stress/page.tsx, crop-stress/page.tsx,
// exposure-risk/page.tsx, trigger-engine/page.tsx, crop-classifier/page.tsx,
// models-in-production/page.tsx) so this view reads the same real JSON they do.

export interface DistrictHazardRow {
  district: string;
  lat: number;
  lon: number;
  n_rows: number;
  n_triggered_rows: number;
  hazards_triggered: Record<string, number>;
}
export interface DistrictHazardSummary {
  districts: DistrictHazardRow[];
}

export interface DroughtDistrict {
  district: string;
  tier: string;
  n_points: number;
  mean_z_score: number;
  mean_current_ndvi: number;
  mean_historical_ndvi: number;
  district_flag: boolean;
}
export interface DroughtNational {
  n_districts_covered: number;
  n_districts_flagged: number;
  last_computed_utc?: string;
  refresh_cadence_note?: string;
  district_results: DroughtDistrict[];
}

export interface CropStressDistrict {
  district: string;
  tier: string;
  n_points: number;
  mean_level_z_score: number;
  n_points_level_anomaly: number;
  n_points_senescence_anomaly: number;
  n_points_both_signals: number;
  frac_points_any_flag: number;
  district_flag_either_signal: boolean;
  district_flag_both_signals: boolean;
}
export interface CropStressScreen {
  n_points_total: number;
  n_districts_covered: number;
  n_districts_flagged_either_signal: number;
  n_districts_flagged_both_signals: number;
  district_results: CropStressDistrict[];
}

export interface CropMixEntry {
  tier: string;
  source: string;
  total_4crop_area_000ha: number;
  crops: Record<string, { area_2022_23_000ha: number; production_2022_23_000t: number; share_of_4crop_area: number }>;
  crops_unreliable_source_data: string[];
}
export type RealCropMix = Record<string, CropMixEntry>;

export interface WaterStressSegment {
  segment_id: number;
  dist_from_head_km: number;
  position: string;
  lat: number;
  lon: number;
  season_et_mm: number | null;
  season_pet_mm: number | null;
  stress_index: number | null;
  elevation_m_srtm: number | null;
}
export interface WaterStress {
  canal_name: string;
  n_segments: number;
  segments: WaterStressSegment[];
  head_vs_tail: {
    head_dist_km: number; head_stress_index: number; head_elevation_m_srtm: number;
    tail_dist_km: number; tail_stress_index: number; tail_elevation_m_srtm: number;
    flow_direction_verdict: string;
  };
}

export interface LocustRegion {
  region: string; boundary_type: string; boundary_note: string;
  sm_surface_m3m3: number | null; sm_surface_anomaly_m3m3: number | null;
  ndvi_recent_30d: number | null; ndvi_prior_30d: number | null; ndvi_delta: number | null;
  soil_favorable_for_egglaying: boolean; vegetation_not_browning: boolean;
  breeding_risk_flag: boolean; confidence: number; source: string;
}
export interface LocustData {
  scope: string;
  last_computed_utc?: string;
  refresh_cadence_note?: string;
  regions: LocustRegion[];
}

export interface FloodDistrictResult {
  district: string;
  mean_model_score: number | null;
  flag: boolean;
  mean_precip_anomaly_pct: number | null;
  lat: number | null;
  lon: number | null;
}
export interface FloodSummary {
  model_version: string;
  status: string;
  last_computed_utc?: string;
  refresh_cadence_note?: string;
  n_districts_flagged_raw: number;
  n_districts_total: number;
  flag_threshold: number;
  district_results: FloodDistrictResult[];
  real_fair_test_validation: {
    v3_model_deployed: { precision: number; recall: number; f1: number; roc_auc: number | null };
  };
  nine_district_investigation: { headline: string; caveat: string };
  threshold_decision: { national_illustrative: number; demo: number; note: string };
  caveats: string[];
}

export interface ExposureRow {
  district: string; date: string; hazard: string; hazard_confidence: number;
  crop: string; crop_stage: string | null; vulnerability_weight: number;
  crop_weight?: number; exposure_score: number; agronomically_plausible: boolean;
  crop_mix_source?: string;
}
export interface ExposureData {
  n_rows: number;
  n_nonzero_exposure: number;
  n_nonzero_exposure_implausible: number;
  crop_mix_source_breakdown?: Record<string, number>;
  top_exposure_events: ExposureRow[];
  top_plausible_exposure_events: ExposureRow[];
}

export interface TriggerSummary {
  last_computed_utc?: string;
  refresh_cadence_note?: string;
  n_triggered: number;
}

export interface AuditRecord {
  event_id: string; district: string; date: string; hazard: string;
  hazard_confidence: number; crop: string; crop_stage: string;
  exposure_score: number; threshold: number;
  crop_mix_source?: string;
  n_real_farms_matched_in_district: number; matched_farm_ids: string[];
  basis_risk_note: string;
  payout: { status: string; note: string; amount: null; transaction_id: null };
}

export interface ModelResult {
  held_out_test_accuracy: number;
  held_out_test_precision_irrigated: number;
  held_out_test_recall_irrigated: number;
  held_out_test_f1_irrigated: number;
}
export interface CropClassifierReport {
  n_farms_total: number; n_farms_used: number;
  class_balance: { irrigated: number; not_irrigated: number };
  majority_class_baseline_accuracy: number;
  models: Record<string, ModelResult>;
}

export interface CropR2 { mae: number; r2: number }
export interface TrackFResults {
  gbt_test_district_level: { wheat: CropR2; cotton: CropR2; rice: CropR2; sugarcane: CropR2; overall_mae: number };
}

export interface DirectionResult {
  district_level: Record<string, { mae: number; r2: number }>;
}
export interface CrossYearResults {
  direction_A_train2122_test2223: DirectionResult;
  direction_B_train2223_test2122: DirectionResult;
  original_week8_within_year_district_level: Record<string, { mae: number; r2: number }>;
}

export interface YieldEvalBlock { n: number; mae: number; r2: number | null }
export interface YieldDirection {
  skipped?: boolean;
  district_level?: YieldEvalBlock;
}
export interface YieldCropResult {
  direction_A_train2122_test2223: YieldDirection;
  direction_B_train2223_test2122: YieldDirection;
  naive_baseline_A_predict2223_from2122: YieldEvalBlock & { skipped?: boolean };
  naive_baseline_B_predict2122_from2223: YieldEvalBlock & { skipped?: boolean };
}
export interface YieldResults {
  crops: Record<string, YieldCropResult>;
}

export interface FireClassifierSummary {
  n_rule_flagged: number;
  both_flagged: number; rule_only: number; model_only: number; neither: number;
  mean_model_score: number;
}
export interface ModelsSummary {
  crop_share_model: { tier_breakdown_126_districts: Record<string, number> };
  fire_classifier: FireClassifierSummary;
}

export interface ForecastAlert {
  district: string;
  valid_date: string;
  forecast_hazard: "frost" | "heat_wave" | "cold_wave";
  window_days?: string[];
  hazard: string;
  flag: boolean;
  confidence: number;
  message_en: string;
  message_ur: string;
  source: string;
}
export interface ForecastData {
  last_computed_utc: string;
  gfs_cycle_utc: string;
  gfs_update_cadence_note: string;
  forecast_horizon_note: string;
  cross_check_caveat: string;
  cloud_proxy_substitution_note: string;
  heat_wave_high_flag_rate_caveat: string | null;
  n_districts: number;
  n_alerts: number;
  n_flagged: number;
  alerts: ForecastAlert[];
}

export interface HistoricalEventSingleMetric {
  id: string;
  hazard_type: string;
  title: string;
  window: string;
  model_label: string;
  kind: "single_metric";
  metric_name: string;
  metric_value: number;
  metric_baseline_value: number;
  metric_baseline_label: string;
  metric_detail: string;
  status: string;
  status_tone: "high" | "moderate" | "low";
  ground_truth_source: string;
  how_measured: string;
  limits: string;
  source_doc: string;
}
export interface HistoricalEventPerCropDirections {
  id: string;
  hazard_type: string;
  title: string;
  window: string;
  model_label: string;
  kind: "per_crop_directions";
  directions: { original: string; A: string; B: string };
  per_crop_r2: Record<string, { original: number; A: number; B: number }>;
  status: string;
  status_tone: "high" | "moderate" | "low";
  ground_truth_source: string;
  how_measured: string;
  limits: string;
  source_doc: string;
}
export interface HistoricalEventYieldDirections {
  id: string;
  hazard_type: string;
  title: string;
  window: string;
  model_label: string;
  kind: "yield_directions";
  rows: { label: string; model_r2: number; naive_r2: number }[];
  status: string;
  status_tone: "high" | "moderate" | "low";
  ground_truth_source: string;
  how_measured: string;
  limits: string;
  source_doc: string;
}
export type HistoricalEvent = HistoricalEventSingleMetric | HistoricalEventPerCropDirections | HistoricalEventYieldDirections;
export interface HistoricalEventsData {
  generated_note: string;
  events: HistoricalEvent[];
}

export interface DataBundle {
  hazards: DistrictHazardSummary | null;
  forecast: ForecastData | null;
  drought: DroughtNational | null;
  cropStress: CropStressScreen | null;
  cropMix: RealCropMix | null;
  water: WaterStress | null;
  locust: LocustData | null;
  flood: FloodSummary | null;
  exposure: ExposureData | null;
  triggerNational: AuditRecord[] | null;
  triggerDemo: AuditRecord[] | null;
  triggerSummaryNational: TriggerSummary | null;
  triggerSummaryDemo: TriggerSummary | null;
  cropClassifier: CropClassifierReport | null;
  trackF: TrackFResults | null;
  crossYear: CrossYearResults | null;
  yieldResults: YieldResults | null;
  models: ModelsSummary | null;
  historicalEvents: HistoricalEventsData | null;
}
