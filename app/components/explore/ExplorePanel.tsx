"use client";

import AlertCard from "../AlertCard";
import ModelCard from "../ModelCard";
import { R2Bar, AccuracyBar, YieldBar } from "../ChartBars";
import { CROPS, Crop, LAYERS, LayerId } from "../../explore/layers";
import type { DataBundle } from "../../explore/types";

const PROJECT_BLURB =
  "NAIP extends an existing satellite hazard-detection pipeline (MSG/SEVIRI + WRF/GFS, " +
  "15-minute cadence — frost, heatwave, cold wave, hail, thunderstorm, fog, dust storm, " +
  "drought, UV) from a Punjab pilot to national coverage, and fuses it with new polar-orbit " +
  "crop and water modules to close the loop into satellite-triggered parametric micro-" +
  "insurance and subsidy targeting. “From nowcasting to payout”: every module ladders " +
  "up to either an alert that reaches a farmer, or a payout/subsidy-targeting decision.";

const TIER_LABEL: Record<string, string> = {
  real_district_area: "real government data",
  model_estimated_interim: "model's best guess",
  model_predicted: "model's best guess",
  hand_classified_mask: "manual estimate",
};
const TIER_CLASS: Record<string, string> = {
  real_district_area: "text-accent-500",
  model_estimated_interim: "text-secondary-500",
  model_predicted: "text-secondary-500",
  hand_classified_mask: "text-faint",
};

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-soft py-1 text-xs">
      <span className="text-dim">{k}</span>
      <span className="tnum font-medium text-main">{v}</span>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-app p-5 text-center text-xs text-faint">{children}</div>
  );
}

function Caveat({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-secondary-500/40 bg-secondary-soft p-3 text-[11px] leading-relaxed text-dim">
      {children}
    </div>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/** Real "last computed" timestamp, same visibility standard everywhere this
    appears -- drought, flood, locust, trigger engine all show this rather
    than burying freshness in a docs file. */
function LastComputed({ iso, note }: { iso?: string; note?: string }) {
  if (!iso) return null;
  return (
    <div className="mt-3 flex items-start gap-1.5 text-[11px] text-faint" title={note}>
      <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
      <span>
        Last computed <span className="tnum text-dim">{timeAgo(iso)}</span>
        {note && <span> (hover for how often this refreshes)</span>}
      </span>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-soft bg-elev-2 p-2.5 text-center">
      <div className="tnum text-base font-semibold text-main">{value}</div>
      <div className="text-[10px] text-faint">{label}</div>
    </div>
  );
}

function HomeDetail({ data }: { data: DataBundle }) {
  const rows = data.hazards?.districts ?? [];
  const totalObservations = rows.reduce((s, d) => s + d.n_rows, 0);
  const districtCount = rows.length || 126;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-soft bg-elev p-4">
        <p className="text-xs leading-relaxed text-dim">{PROJECT_BLURB}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="districts covered" value={districtCount ? districtCount.toLocaleString() : "…"} />
        <StatTile label="real observations" value={totalObservations ? totalObservations.toLocaleString() : "…"} />
        <StatTile label="real farm polygons" value="120" />
        <StatTile label="districts with farm coverage" value="4" />
      </div>
      <p className="text-[11px] text-faint">
        Pick a topic from the nav above — each one swaps what&apos;s drawn on this same map instead of taking you
        to a new page.
      </p>
    </div>
  );
}

function HazardsDetail({ data, district }: { data: DataBundle; district: string | null }) {
  if (!district) return <EmptyHint>Click a district on the map to see its detected hazards.</EmptyHint>;
  const row = data.hazards?.districts.find((d) => d.district === district);
  if (!row) return <EmptyHint>No hazard data for {district}.</EmptyHint>;
  const entries = Object.entries(row.hazards_triggered).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-xl border border-soft bg-elev p-4">
      <h3 className="text-sm font-semibold text-main">{district}</h3>
      <p className="mt-1 text-xs text-dim">
        {row.n_triggered_rows} hazard alert{row.n_triggered_rows === 1 ? "" : "s"} found here
      </p>
      <ul className="mt-3 space-y-1 text-xs">
        {entries.map(([hazard, n]) => (
          <li key={hazard} className="flex justify-between border-b border-soft py-1">
            <span className="text-dim">{hazard.replace(/_/g, " ")}</span>
            <span className="tnum font-medium">{n}</span>
          </li>
        ))}
        {entries.length === 0 && <li className="text-faint">Nothing detected here.</li>}
      </ul>
    </div>
  );
}

function CropStressDetail({ data, district }: { data: DataBundle; district: string | null }) {
  if (!district) return <EmptyHint>Click a district to see its stress signals.</EmptyHint>;
  const row = data.cropStress?.district_results.find((d) => d.district === district);
  if (!row) return <EmptyHint>{district} isn&apos;t covered by this screen.</EmptyHint>;
  return (
    <div className="rounded-xl border border-soft bg-elev p-4">
      <h3 className="text-sm font-semibold text-main">{district}</h3>
      <Row k="Level anomaly points" v={String(row.n_points_level_anomaly)} />
      <Row k="Senescence-slope anomaly points" v={String(row.n_points_senescence_anomaly)} />
      <Row k="Flagged on both signs" v={row.district_flag_both_signals ? "yes" : "no"} />
      <Caveat>This is a screen, not a diagnosis — it flags where to look closer, not what&apos;s wrong.</Caveat>
    </div>
  );
}

function DroughtDetail({ data, district }: { data: DataBundle; district: string | null }) {
  const stamp = <LastComputed iso={data.drought?.last_computed_utc} note={data.drought?.refresh_cadence_note} />;
  if (!district) {
    return (
      <div>
        <EmptyHint>Click a district to see its drought signal.</EmptyHint>
        {stamp}
      </div>
    );
  }
  const row = data.drought?.district_results.find((d) => d.district === district);
  if (!row) return <EmptyHint>{district} isn&apos;t covered by this signal.</EmptyHint>;
  return (
    <div className="rounded-xl border border-soft bg-elev p-4">
      <h3 className="text-sm font-semibold text-main">{district}</h3>
      <Row k="NDVI now" v={row.mean_current_ndvi.toFixed(3)} />
      <Row k="NDVI usual for this time of year" v={row.mean_historical_ndvi.toFixed(3)} />
      <Row k="Z-score vs. own history" v={row.mean_z_score.toFixed(2)} />
      <Row k="Flagged" v={row.district_flag ? "yes — drier than usual" : "no"} />
      {stamp}
    </div>
  );
}

function FloodDetail({ data, district }: { data: DataBundle; district: string | null }) {
  const stamp = <LastComputed iso={data.flood?.last_computed_utc} note={data.flood?.refresh_cadence_note} />;
  if (!district) {
    return (
      <div>
        <EmptyHint>Click a district to see its flood-risk score.</EmptyHint>
        {stamp}
      </div>
    );
  }
  const row = data.flood?.district_results.find((d) => d.district === district);
  if (!row || row.mean_model_score == null) return <EmptyHint>No score for {district}.</EmptyHint>;
  return (
    <div className="rounded-xl border border-soft bg-elev p-4">
      <h3 className="text-sm font-semibold text-main">{district}</h3>
      <Row k="Model score" v={row.mean_model_score.toFixed(3)} />
      {row.mean_precip_anomaly_pct != null && (
        <Row k="Precipitation anomaly" v={`${row.mean_precip_anomaly_pct > 0 ? "+" : ""}${row.mean_precip_anomaly_pct.toFixed(1)}%`} />
      )}
      <Row k="Flagged" v={row.flag ? "yes" : "no"} />
      <Caveat>{data.flood?.threshold_decision.note}</Caveat>
      {stamp}
    </div>
  );
}

function CropModelDetail({
  data,
  district,
  cropPick,
  onCropPickChange,
}: {
  data: DataBundle;
  district: string | null;
  cropPick: Crop;
  onCropPickChange: (c: Crop) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {CROPS.map((c) => (
          <button
            key={c}
            onClick={() => onCropPickChange(c)}
            className={`rounded-full border px-2.5 py-1 text-[11px] capitalize transition-colors ${
              c === cropPick ? "border-accent-500 bg-accent-soft text-accent-500 font-semibold" : "border-soft text-dim hover:text-main"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {!district ? (
        <EmptyHint>Click a district to see its crop mix.</EmptyHint>
      ) : (
        (() => {
          const entry = data.cropMix?.[district];
          if (!entry) return <EmptyHint>No crop-mix data for {district}.</EmptyHint>;
          return (
            <div className="rounded-xl border border-soft bg-elev p-4">
              <h3 className="text-sm font-semibold text-main">{district}</h3>
              <p className={`mt-1 text-[11px] font-medium ${TIER_CLASS[entry.tier] ?? "text-faint"}`}>
                {TIER_LABEL[entry.tier] ?? entry.tier}
              </p>
              {CROPS.map((c) => (
                <Row key={c} k={c} v={`${((entry.crops[c]?.share_of_4crop_area ?? 0) * 100).toFixed(1)}%`} />
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}

function IrrigationDetail({ data }: { data: DataBundle }) {
  if (!data.cropClassifier) return <EmptyHint>Loading irrigation-classifier results…</EmptyHint>;
  const d = data.cropClassifier;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-center">
        <StatTile label="farms checked" value={`${d.n_farms_used}/${d.n_farms_total}`} />
        <StatTile label="irrigated" value={String(d.class_balance.irrigated)} />
        <StatTile label="not irrigated" value={String(d.class_balance.not_irrigated)} />
        <StatTile label="baseline (always guess 'no')" value={`${(d.majority_class_baseline_accuracy * 100).toFixed(1)}%`} />
      </div>
      <div className="rounded-xl border border-soft bg-elev p-4">
        <h3 className="mb-1 text-sm font-semibold text-main">How accurate is the guess?</h3>
        <p className="mb-3 text-xs text-faint">
          The baseline mark is what you&apos;d get by always guessing &ldquo;not irrigated.&rdquo; Our models land
          a little below it — shown honestly, not rounded up.
        </p>
        {Object.entries(d.models).map(([name, m]) => (
          <div key={name} className="mb-3">
            <div className="mb-1 text-xs font-medium capitalize text-main">{name.replace(/_/g, " ")}</div>
            <AccuracyBar label="Accuracy" value={m.held_out_test_accuracy} baseline={d.majority_class_baseline_accuracy} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CrossYearDetail({ data }: { data: DataBundle }) {
  if (!data.crossYear) return <EmptyHint>Loading cross-year validation results…</EmptyHint>;
  const cy = data.crossYear;
  return (
    <div className="overflow-x-auto rounded-xl border border-soft">
      <table className="w-full min-w-[420px] text-left text-xs">
        <thead>
          <tr className="border-b border-soft text-faint">
            <th className="px-3 py-2 font-medium">Crop</th>
            <th className="px-3 py-2 font-medium">Same year</th>
            <th className="px-3 py-2 font-medium">Different year (A)</th>
            <th className="px-3 py-2 font-medium">Different year (B)</th>
          </tr>
        </thead>
        <tbody>
          {CROPS.map((crop) => {
            const orig = cy.original_week8_within_year_district_level[crop]?.r2;
            const a = cy.direction_A_train2122_test2223.district_level[crop]?.r2;
            const b = cy.direction_B_train2223_test2122.district_level[crop]?.r2;
            if (orig == null || a == null || b == null) return null;
            return (
              <tr key={crop} className="border-b border-soft/50 last:border-0">
                <td className="px-3 py-2 capitalize text-main">{crop}</td>
                <td className="tnum px-3 py-2 text-dim">{orig.toFixed(3)}</td>
                <td className="tnum px-3 py-2 text-dim">{a.toFixed(3)}</td>
                <td className="tnum px-3 py-2 text-dim">{b.toFixed(3)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function YieldDetail({ data }: { data: DataBundle }) {
  if (!data.trackF || !data.yieldResults) return <EmptyHint>Loading yield-prediction results…</EmptyHint>;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-soft bg-elev p-4">
        <h3 className="mb-1 text-sm font-semibold text-main">Crop share R² vs. constant baseline</h3>
        <p className="mb-3 text-xs text-faint">Higher is better. Sugarcane&apos;s guess isn&apos;t reliable — shown as-is.</p>
        {CROPS.map((crop) => (
          <R2Bar key={crop} crop={crop} r2={data.trackF!.gbt_test_district_level[crop].r2} />
        ))}
      </div>
      <div className="rounded-xl border border-soft bg-elev p-4">
        <h3 className="mb-1 text-sm font-semibold text-main">Yield: model vs. simple guess</h3>
        <p className="mb-3 text-xs text-faint">Where the gray bar reaches further, the simple guess really does win.</p>
        {CROPS.flatMap((crop) => {
          const c = data.yieldResults!.crops[crop];
          if (!c) return [];
          return [
            {
              label: `${crop} (A)`,
              modelR2: c.direction_A_train2122_test2223.district_level?.r2 ?? null,
              naiveR2: c.naive_baseline_A_predict2223_from2122.skipped ? null : c.naive_baseline_A_predict2223_from2122.r2,
            },
            {
              label: `${crop} (B)`,
              modelR2: c.direction_B_train2223_test2122.district_level?.r2 ?? null,
              naiveR2: c.naive_baseline_B_predict2122_from2223.skipped ? null : c.naive_baseline_B_predict2122_from2223.r2,
            },
          ]
            .filter((r) => r.modelR2 != null || r.naiveR2 != null)
            .map((r) => <YieldBar key={r.label} {...r} />);
        })}
      </div>
    </div>
  );
}

function ExposureDetail({ data, district }: { data: DataBundle; district: string | null }) {
  if (!data.exposure) return <EmptyHint>Loading exposure events…</EmptyHint>;
  if (!district) {
    return (
      <EmptyHint>
        Click a colored district to see its exposure event. Only the top 50 events are scored, covering{" "}
        {new Set(data.exposure.top_exposure_events.map((e) => e.district)).size} districts — the rest aren&apos;t
        ruled safe, they&apos;re just not in this list yet.
      </EmptyHint>
    );
  }
  const rows = data.exposure.top_exposure_events.filter((e) => e.district === district);
  if (rows.length === 0) {
    return (
      <EmptyHint>{district} isn&apos;t in the top-50 scored events — not ruled safe, simply not scored this pass.</EmptyHint>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="rounded-xl border border-soft bg-elev p-4">
          <h3 className="text-sm font-semibold text-main">
            {district} · {r.hazard.replace(/_/g, " ")} × {r.crop}
          </h3>
          <Row k="Date" v={r.date} />
          <Row k="Hazard confidence" v={r.hazard_confidence.toString()} />
          {r.crop_mix_source && <Row k="Crop data source" v={TIER_LABEL[r.crop_mix_source] ?? r.crop_mix_source} />}
          <Row k="Exposure score" v={String(r.exposure_score)} />
          <Row k="Agronomically plausible" v={r.agronomically_plausible ? "yes" : "no — impossible pairing"} />
        </div>
      ))}
    </div>
  );
}

function TriggerDetail({
  data,
  district,
  threshold,
  onThresholdChange,
}: {
  data: DataBundle;
  district: string | null;
  threshold: "national" | "demo";
  onThresholdChange: (t: "national" | "demo") => void;
}) {
  const records = (threshold === "national" ? data.triggerNational : data.triggerDemo) ?? [];
  const filtered = district ? records.filter((r) => r.district === district) : records;
  const summary = threshold === "national" ? data.triggerSummaryNational : data.triggerSummaryDemo;

  return (
    <div className="space-y-3">
      <LastComputed iso={summary?.last_computed_utc} note={summary?.refresh_cadence_note} />
      <div className="flex gap-2 text-[11px]">
        <button
          onClick={() => onThresholdChange("national")}
          className={`rounded-full border px-2.5 py-1 transition-colors ${threshold === "national" ? "border-accent-500 bg-accent-soft text-accent-500 font-semibold" : "border-soft text-dim"}`}
        >
          Strict threshold
        </button>
        <button
          onClick={() => onThresholdChange("demo")}
          className={`rounded-full border px-2.5 py-1 transition-colors ${threshold === "demo" ? "border-accent-500 bg-accent-soft text-accent-500 font-semibold" : "border-soft text-dim"}`}
        >
          Looser threshold
        </button>
      </div>

      {district && (
        <p className="text-[11px] text-faint">
          Showing events in {district} only.{" "}
          <button className="underline underline-offset-2" onClick={() => onThresholdChange(threshold)}>
            (click the map again to change district)
          </button>
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyHint>No trigger events {district ? `in ${district}` : ""} at this threshold.</EmptyHint>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {filtered.map((r) => (
            <AlertCard
              key={r.event_id}
              title={`${r.district} · ${r.hazard.replace(/_/g, " ")} × ${r.crop}`}
              subtitle={`${TIER_LABEL[r.crop_mix_source ?? ""] ?? r.crop_mix_source ?? "—"} · ${r.n_real_farms_matched_in_district} real farm${r.n_real_farms_matched_in_district === 1 ? "" : "s"} matched`}
              severity="critical"
              confidencePct={Math.round(r.hazard_confidence * 100)}
              modelLabel={`score ${r.exposure_score}`}
              asOf={r.date}
              tierLabel={TIER_LABEL[r.crop_mix_source ?? ""] ?? r.crop_mix_source ?? "—"}
              tierClassName={TIER_CLASS[r.crop_mix_source ?? ""] ?? "text-faint"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModelsDetail({ data }: { data: DataBundle }) {
  if (!data.models) return <EmptyHint>Loading model summaries…</EmptyHint>;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-soft bg-elev p-4">
        <p className="text-xs leading-relaxed text-dim">{PROJECT_BLURB}</p>
      </div>
      <p className="text-[11px] text-faint">
        Every model output below is reported against a real baseline, with sample size and coverage limitations
        stated plainly — nothing here is smoothed over for a better-looking number.
      </p>
      <ModelCard
        name="National Crop-Share Model"
        version="Trained on real satellite images and real government crop data"
        confidenceLabel="moderate"
        trainedOn="Learns from how fields look in satellite images across a growing season, matched against real government crop records."
        comparison={[
          { label: "Wheat", value: 0.581 },
          { label: "Cotton", value: 0.507 },
          { label: "Rice", value: 0.420 },
          { label: "Sugarcane", value: -1.12, negative: true },
        ]}
      >
        Works well for wheat, cotton, and rice. Sugarcane&apos;s guess isn&apos;t reliable.
      </ModelCard>
      <ModelCard
        name="Fire Detector"
        version="Trained on real satellite heat data, tested on a year it had never seen"
        confidenceLabel="moderate"
        trainedOn="Looks at heat patterns in satellite images, without using location as a shortcut."
        comparison={[
          { label: "Trained model", value: 0.354 },
          { label: "Simple rule", value: 0.002, isBaseline: true },
        ]}
      >
        The trained model catches far more real fires than the simple rule does.
      </ModelCard>
      {data.flood && (
        <ModelCard
          name="Flood Risk Model"
          version="Uses satellite radar, water maps, and real rainfall data"
          confidenceLabel="moderate"
          trainedOn="Trained on a real flood event, tested on a different real flood year it had never seen."
          comparison={[
            { label: "Trained model", value: data.flood.real_fair_test_validation.v3_model_deployed.f1 },
            { label: "Simple rule", value: 0.143, isBaseline: true },
          ]}
        >
          Out of every 100 places flagged as flooded, about 19 really were.
        </ModelCard>
      )}
    </div>
  );
}

export default function ExplorePanel({
  layerId,
  data,
  selectedDistrict,
  cropPick,
  onCropPickChange,
  triggerThreshold,
  onTriggerThresholdChange,
}: {
  layerId: LayerId;
  data: DataBundle;
  selectedDistrict: string | null;
  cropPick: Crop;
  onCropPickChange: (c: Crop) => void;
  triggerThreshold: "national" | "demo";
  onTriggerThresholdChange: (t: "national" | "demo") => void;
}) {
  const meta = LAYERS[layerId];

  return (
    <div className="flex flex-col gap-4">
      <div>
        {meta.group && <div className="font-mono text-[10.5px] uppercase tracking-wide text-faint">{meta.group}</div>}
        <h2 className="mt-0.5 text-base font-semibold text-main">{meta.label}</h2>
        <p className="mt-1.5 max-w-[42ch] text-xs leading-relaxed text-dim">{meta.about}</p>
      </div>

      {layerId === "home" && <HomeDetail data={data} />}
      {layerId === "hazards" && <HazardsDetail data={data} district={selectedDistrict} />}
      {layerId === "cropstress" && <CropStressDetail data={data} district={selectedDistrict} />}
      {layerId === "drought" && <DroughtDetail data={data} district={selectedDistrict} />}
      {layerId === "flood" && <FloodDetail data={data} district={selectedDistrict} />}
      {layerId === "cropmodel" && (
        <CropModelDetail data={data} district={selectedDistrict} cropPick={cropPick} onCropPickChange={onCropPickChange} />
      )}
      {layerId === "irrigation" && <IrrigationDetail data={data} />}
      {layerId === "crossyear" && <CrossYearDetail data={data} />}
      {layerId === "yield" && <YieldDetail data={data} />}
      {layerId === "exposure" && <ExposureDetail data={data} district={selectedDistrict} />}
      {layerId === "trigger" && (
        <TriggerDetail data={data} district={selectedDistrict} threshold={triggerThreshold} onThresholdChange={onTriggerThresholdChange} />
      )}
      {layerId === "models" && <ModelsDetail data={data} />}
      {layerId === "locust" && (
        <div className="space-y-3">
          {(data.locust?.regions ?? []).map((r) => (
            <div key={r.region} className="rounded-xl border border-soft bg-elev p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-main">{r.region}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    r.breeding_risk_flag ? "bg-critical text-white" : "border border-soft text-faint"
                  }`}
                >
                  {r.breeding_risk_flag ? "Flagged" : "Not flagged"}
                </span>
              </div>
              <Row k="Soil damp enough?" v={r.soil_favorable_for_egglaying ? "Yes" : "No"} />
              <Row k="Vegetation not browning much?" v={r.vegetation_not_browning ? "Yes" : "No"} />
              <Row k="Confidence" v={`${Math.round(r.confidence * 100)}%`} />
            </div>
          ))}
          <LastComputed iso={data.locust?.last_computed_utc} note={data.locust?.refresh_cadence_note} />
        </div>
      )}
      {layerId === "canal" && data.water && (
        <div className="rounded-xl border border-soft bg-elev p-4">
          <h3 className="text-sm font-semibold text-main">{data.water.canal_name}</h3>
          <Row k="Head stress index" v={data.water.head_vs_tail.head_stress_index.toFixed(3)} />
          <Row k="Tail stress index" v={data.water.head_vs_tail.tail_stress_index.toFixed(3)} />
          <Row k="Flow direction" v={data.water.head_vs_tail.flow_direction_verdict} />
        </div>
      )}
    </div>
  );
}
