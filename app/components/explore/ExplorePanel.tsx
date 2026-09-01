"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import AlertCard from "../AlertCard";
import ModelCard from "../ModelCard";
import { R2Bar, AccuracyBar, YieldBar } from "../ChartBars";
import ProvenanceLine from "../ProvenanceLine";
import FarmSubmissionForm from "./FarmSubmissionForm";
import { CROPS, Crop, LAYERS, LAYER_GROUPS, LayerId } from "../../explore/layers";
import type { DataBundle, HistoricalEvent } from "../../explore/types";
import { useAppLocale } from "../../i18n/LocaleProvider";
import { formatDate, formatDatesInText } from "../../lib/formatDate";
import { HAZARD_INFO } from "../../lib/hazardInfo";

const PROJECT_BLURB =
  "NAIP extends an existing satellite hazard-detection pipeline (MSG/SEVIRI + WRF/GFS, " +
  "15-minute cadence — frost, heatwave, cold wave, hail, thunderstorm, fog, dust storm, " +
  "drought, UV) from a Punjab pilot to national coverage, and fuses it with new polar-orbit " +
  "crop and water modules to close the loop into satellite-triggered parametric micro-" +
  "insurance and subsidy targeting. “From nowcasting to payout”: every module ladders " +
  "up to either an alert that reaches a farmer, or a payout/subsidy-targeting decision.";

const PROJECT_BLURB_UR =
  "NAIP ایک موجودہ سیٹلائٹ خطرہ شناخت کے نظام (MSG/SEVIRI + WRF/GFS، 15 منٹ کی رفتار — پالا، " +
  "گرمی کی لہر، سردی کی لہر، اولے، آندھی، دھند، دھول کا طوفان، خشک سالی، UV) کو پنجاب کے تجرباتی " +
  "علاقے سے پورے ملک تک وسیع کرتا ہے، اور اسے فصل و پانی کے نئے ماڈیولز سے جوڑ کر سیٹلائٹ بنیاد " +
  "پر خودکار مائیکرو انشورنس اور سبسڈی کے فیصلوں تک لے جاتا ہے۔ ہر ماڈیول یا تو کسان تک پہنچنے " +
  "والے الرٹ پر، یا معاوضے/سبسڈی کے فیصلے پر منتج ہوتا ہے۔";

/** meta.group is a plain English label (e.g. "Hazard Monitoring") -- look up
    its real Urdu translation from the same LAYER_GROUPS config the nav uses,
    rather than duplicating the group labels here. */
const GROUP_LABEL_UR: Record<string, string> = Object.fromEntries(
  LAYER_GROUPS.map((g) => [g.label, g.labelUr])
);

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
  const { locale } = useAppLocale();
  const t = useTranslations("home");
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-soft bg-elev p-4">
        <p className={`text-xs leading-relaxed text-dim ${locale === "ur" ? "urdu-text" : ""}`} dir={locale === "ur" ? "rtl" : undefined}>
          {locale === "ur" ? PROJECT_BLURB_UR : PROJECT_BLURB}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatTile label={t("statDistricts")} value={districtCount ? districtCount.toLocaleString() : "…"} />
        <StatTile label={t("statObservations")} value={totalObservations ? totalObservations.toLocaleString() : "…"} />
        <StatTile label={t("statFarms")} value="120" />
        <StatTile label={t("statFarmDistricts")} value="4" />
      </div>
      <p className={`text-[11px] text-faint ${locale === "ur" ? "urdu-text" : ""}`} dir={locale === "ur" ? "rtl" : undefined}>
        {t("hint")}
      </p>
    </div>
  );
}

const FORECAST_HAZARD_LABEL: Record<string, string> = {
  frost: "Frost", heat_wave: "Heat wave", cold_wave: "Cold wave",
};

function HazardWindowToggle({ view, onChange }: { view: "live" | "forecast"; onChange: (v: "live" | "forecast") => void }) {
  return (
    <div className="flex gap-2 text-[11px]">
      <button
        onClick={() => onChange("live")}
        className={`rounded-full border px-2.5 py-1 transition-colors ${view === "live" ? "border-accent-500 bg-accent-soft text-accent-500 font-semibold" : "border-soft text-dim"}`}
      >
        Live window
      </button>
      <button
        onClick={() => onChange("forecast")}
        className={`rounded-full border px-2.5 py-1 transition-colors ${view === "forecast" ? "border-accent-500 bg-accent-soft text-accent-500 font-semibold" : "border-soft text-dim"}`}
      >
        Forecast window (72h)
      </button>
    </div>
  );
}

function LiveHazardsWindow({ data, district }: { data: DataBundle; district: string | null }) {
  const { locale } = useAppLocale();
  if (!district) return <EmptyHint>Click a district on the map to see its current hazard status.</EmptyHint>;
  const row = data.hazardCurrent?.districts.find((d) => d.district === district);
  if (!row) return <EmptyHint>No hazard data for {district}.</EmptyHint>;
  // Flagged hazards first, then the rest -- all 11 real hazard types always
  // shown, never silently omitted, so "not currently flagged" is a real,
  // explicit statement, not an absence a reader has to interpret.
  const entries = [...row.hazards].sort((a, b) => Number(b.currently_flagged) - Number(a.currently_flagged));
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-soft bg-elev p-4">
        <h3 className="text-sm font-semibold text-main">{district}</h3>
        <p className="mt-1 text-xs text-dim">
          {row.n_currently_flagged === 0
            ? "No hazard currently flagged here"
            : `${row.n_currently_flagged} hazard${row.n_currently_flagged === 1 ? "" : "s"} currently flagged here`}
          {" "}— as of the most recent real check, {formatDate(row.most_recent_check_date)}
        </p>
      </div>
      {entries.map((h) => (
        <div
          key={h.hazard}
          className={`rounded-lg border p-3 text-xs ${h.currently_flagged ? "border-secondary-500/50 bg-secondary-soft" : "border-soft bg-elev"}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium capitalize text-main">{h.hazard.replace(/_/g, " ")}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${h.currently_flagged ? "bg-secondary-500 text-white" : "text-faint"}`}
            >
              {h.currently_flagged ? "Flagged now" : "No hazard right now"}
            </span>
          </div>
          {HAZARD_INFO[h.hazard] && <p className="mt-1.5 text-[11px] leading-relaxed text-dim">{HAZARD_INFO[h.hazard]}</p>}
          <div className="mt-2 rounded-md bg-elev-2 p-2">
            <p
              className={`text-[11px] leading-relaxed text-dim ${locale === "ur" ? "urdu-text" : ""}`}
              dir={locale === "ur" ? "rtl" : undefined}
            >
              {locale === "ur" ? h.message_ur : h.message_en}
            </p>
            <p className="mt-1 text-[10px] text-faint">
              as of {formatDate(h.date)} · confidence {Math.round(h.max_confidence * 100)}%
            </p>
          </div>
          {/* Real historical context, shown alongside the live reading above,
              never blended into it -- a separate, clearly-labeled line, per
              explicit direction, so "flagged now" and "how often has this
              ever happened" can never be mistaken for the same number. */}
          <p className="mt-2 border-t border-soft pt-1.5 text-[10px] text-faint">
            Historically: {h.historical_n_days_triggered === 0
              ? "never triggered in the real archive on disk"
              : (
                <>
                  triggered on <span className="tnum">{h.historical_n_days_triggered}</span> real day
                  {h.historical_n_days_triggered === 1 ? "" : "s"} in the archive, last on{" "}
                  <span className="tnum">{formatDate(h.historical_last_triggered_date)}</span>
                </>
              )}
          </p>
        </div>
      ))}
    </div>
  );
}

function ForecastWindow({ data, district }: { data: DataBundle; district: string | null }) {
  const { locale } = useAppLocale();
  if (!data.forecast) return <EmptyHint>Loading forecast…</EmptyHint>;
  const f = data.forecast;
  const stamp = (
    <div className="mt-1 text-[11px] text-faint">
      Real GFS cycle: <span className="tnum text-dim">{new Date(f.gfs_cycle_utc).toUTCString()}</span>
      <LastComputed iso={f.last_computed_utc} note={f.gfs_update_cadence_note} />
    </div>
  );

  if (!district) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-soft bg-elev p-4">
          <div className="flex justify-between text-xs">
            <span className="text-dim">Districts with any forecast flag</span>
            <span className="tnum font-semibold text-main">{f.n_flagged} / {f.n_districts}</span>
          </div>
        </div>
        {f.heat_wave_high_flag_rate_caveat && <Caveat>{f.heat_wave_high_flag_rate_caveat}</Caveat>}
        <EmptyHint>Click a district to see its 3-day forecast detail.</EmptyHint>
        {stamp}
      </div>
    );
  }

  // Flagged rows first, same scanning convenience as the Live window --
  // and every row gets an explicit, unambiguous badge either way, so a
  // real "checked, not flagged" result never reads as a live warning just
  // because its hazard name and real explainer text are still shown.
  const rows = [...f.alerts.filter((a) => a.district === district)].sort(
    (a, b) => Number(b.flag) - Number(a.flag)
  );
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-main">{district}</h3>
      {rows.map((r, i) => (
        <div key={i} className={`rounded-lg border p-3 text-xs ${r.flag ? "border-secondary-500/50 bg-secondary-soft" : "border-soft bg-elev"}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-main">
              {FORECAST_HAZARD_LABEL[r.forecast_hazard] ?? r.forecast_hazard}
              {r.window_days
                ? ` (${formatDate(r.window_days[0])} → ${formatDate(r.window_days[r.window_days.length - 1])})`
                : ` — ${formatDate(r.valid_date)}`}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${r.flag ? "bg-secondary-500 text-white" : "text-faint"}`}
            >
              {r.flag ? "Forecast flag" : "No risk forecast"}
            </span>
          </div>
          {HAZARD_INFO[r.forecast_hazard] && <p className="mt-1 text-[11px] leading-relaxed text-dim">{HAZARD_INFO[r.forecast_hazard]}</p>}
          <div className="mt-2 rounded-md bg-elev-2 p-2">
            <p
              className={`text-faint ${locale === "ur" ? "urdu-text" : ""}`}
              dir={locale === "ur" ? "rtl" : undefined}
              lang={locale === "ur" ? "ur" : undefined}
            >
              {locale === "ur" ? r.message_ur : r.message_en}
            </p>
            <p className="mt-1 text-[10px] text-faint">confidence {Math.round(r.confidence * 100)}% · {r.source}</p>
          </div>
        </div>
      ))}
      {rows.length === 0 && <EmptyHint>No forecast rows for {district}.</EmptyHint>}
      {f.heat_wave_high_flag_rate_caveat && rows.some((r) => r.forecast_hazard === "heat_wave" && r.flag) && (
        <Caveat>{f.heat_wave_high_flag_rate_caveat}</Caveat>
      )}
      <Caveat>{f.cross_check_caveat} {f.cloud_proxy_substitution_note}</Caveat>
      {stamp}
    </div>
  );
}

function HazardsDetail({
  data,
  district,
  hazardsView,
  onHazardsViewChange,
}: {
  data: DataBundle;
  district: string | null;
  hazardsView: "live" | "forecast";
  onHazardsViewChange: (v: "live" | "forecast") => void;
}) {
  return (
    <div className="space-y-3">
      <HazardWindowToggle view={hazardsView} onChange={onHazardsViewChange} />
      {hazardsView === "live" ? (
        <LiveHazardsWindow data={data} district={district} />
      ) : (
        <ForecastWindow data={data} district={district} />
      )}
    </div>
  );
}

function CropStressDetail({ data, district }: { data: DataBundle; district: string | null }) {
  const t = useTranslations();
  const { locale } = useAppLocale();
  if (!district) return <EmptyHint>Click a district to see its stress signals.</EmptyHint>;
  const row = data.cropStress?.district_results.find((d) => d.district === district);
  if (!row) return <EmptyHint>{district} isn&apos;t covered by this screen.</EmptyHint>;
  return (
    <div className="rounded-xl border border-soft bg-elev p-4">
      <h3 className="text-sm font-semibold text-main">{district}</h3>
      <Row k="Level anomaly points" v={String(row.n_points_level_anomaly)} />
      <Row k="Senescence-slope anomaly points" v={String(row.n_points_senescence_anomaly)} />
      <Row k="Flagged on both signs" v={row.district_flag_both_signals ? "yes" : "no"} />
      <Caveat>
        {locale === "ur" ? (
          <span dir="rtl" lang="ur" className="urdu-text">
            {t("cropStressCaveat")}
          </span>
        ) : (
          t("cropStressCaveat")
        )}
      </Caveat>
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
  const ndviBand =
    row.mean_current_ndvi < 0.15
      ? "bare ground or minimal vegetation"
      : row.mean_current_ndvi < 0.3
      ? "sparse, stressed vegetation"
      : row.mean_current_ndvi < 0.5
      ? "moderate, healthy vegetation"
      : "dense vegetation";
  const pctThreshold = data.drought?.flag_threshold_percentile_this_year;
  return (
    <div className="rounded-xl border border-soft bg-elev p-4">
      <h3 className="text-sm font-semibold text-main">{district}</h3>
      <Row k="NDVI now" v={row.mean_current_ndvi.toFixed(3)} />
      <Row k="NDVI usual for this time of year" v={row.mean_historical_ndvi.toFixed(3)} />
      <Row k="Z-score vs. own history" v={row.mean_z_score.toFixed(2)} />
      <Row k="Flagged" v={row.district_flag ? "yes — drier than usual" : "no"} />

      <div className="mt-2 space-y-1.5 rounded-md bg-elev-2 p-2 text-[11px] leading-relaxed text-dim">
        <p>
          <strong className="text-main">NDVI</strong> (vegetation greenness, from satellite imagery) runs
          roughly 0 to 1: near 0 is bare soil or water, 0.2&ndash;0.3 is sparse or stressed vegetation,
          0.4&ndash;0.6 is moderate healthy vegetation, above 0.6 is dense growth.{" "}
          {district}&apos;s current {row.mean_current_ndvi.toFixed(3)} reads as{" "}
          <strong className="text-main">{ndviBand}</strong>.
        </p>
        <p>
          <strong className="text-main">&ldquo;usual for this time of year&rdquo;</strong> is this same
          district&apos;s own real satellite average for this month across a multi-year historical record
          &mdash; not a national average, so a naturally dry district being compared to its own dry normal
          won&apos;t get flagged just for being dry.
        </p>
        <p>
          <strong className="text-main">Z-score</strong> is how many standard deviations today&apos;s NDVI
          sits from that district&apos;s own historical average for this time of year: 0 is exactly
          typical, positive is greener than usual, negative is drier than usual.{" "}
          {pctThreshold != null && (
            <>A district is flagged when its z-score falls in the driest ~10% of all districts nationally
            this pass &mdash; currently around z &le; {pctThreshold.toFixed(2)}, a real threshold that
            moves with the national distribution each run, not a fixed cutoff.</>
          )}
        </p>
      </div>

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
          <Row k="Date" v={formatDate(r.date)} />
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
              asOf={formatDate(r.date)}
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
}

const STATUS_TONE_CLASS: Record<string, string> = {
  high: "bg-accent-500 text-white",
  moderate: "bg-secondary-500 text-white",
  low: "bg-[#8c8878] text-white",
};

function EventCard({ event }: { event: HistoricalEvent }) {
  return (
    <div className="rounded-xl border border-soft bg-elev p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-main">{event.title}</h3>
          <p className="mt-0.5 text-[11px] text-faint">{formatDatesInText(event.window)}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_TONE_CLASS[event.status_tone]}`}>
          {event.status}
        </span>
      </div>
      <p className="mt-2 text-xs text-dim">{event.model_label}</p>

      <div className="mt-3">
        {event.kind === "single_metric" && (
          <AccuracyBar label={`${event.metric_name} vs. ${event.metric_baseline_label}`} value={event.metric_value} baseline={event.metric_baseline_value} />
        )}
        {event.kind === "per_crop_directions" &&
          CROPS.map((crop) => {
            const r2 = event.per_crop_r2[crop];
            if (!r2) return null;
            return (
              <div key={crop} className="mb-3">
                <div className="mb-1 text-[11px] font-medium capitalize text-main">{crop}</div>
                <R2Bar crop={event.directions.original} r2={r2.original} />
                <R2Bar crop={event.directions.A} r2={r2.A} />
                <R2Bar crop={event.directions.B} r2={r2.B} />
              </div>
            );
          })}
        {event.kind === "yield_directions" &&
          event.rows.map((r) => <YieldBar key={r.label} label={r.label} modelR2={r.model_r2} naiveR2={r.naive_r2} />)}
      </div>

      {"metric_detail" in event && <p className="mt-2 text-[11px] text-faint">{event.metric_detail}</p>}

      <div className="mt-3 space-y-2 text-[11px] leading-relaxed">
        <div>
          <span className="font-medium text-dim">How this was measured — </span>
          <span className="text-faint">{event.how_measured}</span>
        </div>
        <div className="rounded-lg border border-secondary-500/40 bg-secondary-soft p-2.5 text-dim">
          <span className="font-medium">Limits of this comparison — </span>
          {event.limits}
        </div>
      </div>

      <ProvenanceLine source={`Ground truth: ${event.ground_truth_source}`} updated={event.source_doc} />
    </div>
  );
}

function HistoryDetail({ data }: { data: DataBundle }) {
  if (!data.historicalEvents) return <EmptyHint>Loading historical events…</EmptyHint>;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-soft bg-elev p-4">
        <p className="text-xs leading-relaxed text-dim">{data.historicalEvents.generated_note}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {data.historicalEvents.events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}

const PMIU_STATUS_CLASS: Record<string, string> = {
  Dry: "text-critical bg-critical-soft border-critical/40",
  Short: "text-secondary-500 bg-secondary-soft border-secondary-500/40",
  Authorized: "text-accent-500 bg-accent-soft border-accent-500/40",
  Excessive: "text-secondary-500 bg-secondary-soft border-secondary-500/40",
};

/** Track V, Part 2: real PMIU (Punjab Irrigation Department) government
    channel-gauge data -- 2,012 real channels, a directly-measured
    gauge-vs-entitlement quantity, structurally separate from the
    satellite-inferred stress_index shown above it in the same "canal"
    layer. Deliberately its own component/section (own search+sort state,
    own about-text with the real exclusion counts) rather than folded into
    CanalDetail's Row list, so the two real metrics never blend into one
    number on screen. A searchable/filterable list, not 2,012 cards --
    checked before building: this project's Farm Registry map already
    proved ~750 Leaflet markers render with no lag, so a real clustered
    map layer was added separately (ExploreMap.tsx) alongside this list,
    not instead of it.

    REAL SORT-ORDER FIX (checked, not assumed broken): the real raw
    distribution across all 2,012 channels was pulled and checked directly
    against PMIU's own raw API response (see CLAUDE.md's Track V entry) --
    63.8% sit at 0.9-1.1 (near their own real sanctioned level), median is
    genuinely 1.0, and the 20.8% real Dry channels were confirmed, not a
    parsing bug, by reading three specific channels' raw GaugeValue/Status
    fields directly (PMIU's own backend reports them Dry, consistent with
    Pakistan's real rotational canal-closure schedules). The data was never
    the problem -- "worst tail ratio first" as the DEFAULT sort put an
    unrepresentative, alarming-looking 20.8% slice in front of a first-time
    viewer. Default is now alphabetical; "worst ratio first" stays available
    as an explicit real option, not what loads first. */
type PMIUSort = "name" | "worst_ratio";

function PMIUChannelExplorer({ data }: { data: DataBundle }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<PMIUSort>("name");
  const [visibleCount, setVisibleCount] = useState(50);

  const pmiu = data.pmiu;

  const filtered = useMemo(() => {
    if (!pmiu) return [];
    const q = search.trim().toLowerCase();
    const base = q ? pmiu.channels.filter((c) => c.name.toLowerCase().includes(q)) : pmiu.channels;
    const sorted = [...base];
    if (sort === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => a.tail_gauge_ratio - b.tail_gauge_ratio);
    }
    return sorted;
  }, [pmiu, search, sort]);

  if (!pmiu) return <EmptyHint>Loading real PMIU channel data…</EmptyHint>;

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="mt-5 space-y-3 border-t border-soft pt-4">
      <div>
        <h3 className="text-sm font-semibold text-main">
          Real Government Channel Gauges (PMIU)
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-dim">
          A different, directly-measured quantity from the satellite stress index above —
          Punjab Irrigation&apos;s own daily gauge reading at each channel&apos;s tail, divided by
          that channel&apos;s own real sanctioned (authorized) tail gauge. 1.00 means the tail is
          running exactly at its real entitlement; below 1.00 means it is running short.
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
          PMIU reported {pmiu.n_channels_returned_by_pmiu.toLocaleString()} real channels for{" "}
          {pmiu.reading_date}. {pmiu.n_channels_included.toLocaleString()} shown here — excludes{" "}
          {pmiu.n_excluded_not_reported_NR.toLocaleString()} not-reported that day,{" "}
          {pmiu.n_excluded_already_covered_by_existing_module} already covered by the satellite
          module above (Muridke Disty, Upper Sohag Branch — kept separate rather than double-
          counted), and {pmiu.n_excluded_missing_or_zero_authorized_gauge} with no real
          entitlement value to compare against. Real ratio range across all included channels is
          0.0–3.5, median 1.0 — 63.8% sit within 0.9–1.1 of their own sanctioned level. A real
          20.8% show as fully Dry (ratio 0.00) — checked directly against PMIU&apos;s own raw
          reading, not a parsing artifact here; likely reflects Pakistan&apos;s real rotational
          canal-closure schedules (a channel can be legitimately closed on a given day), not
          necessarily a fault. List defaults to A–Z so this real minority doesn&apos;t dominate
          the first view — switch the sort below to see it directly.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(50);
          }}
          placeholder="Search a channel by name…"
          className="flex-1 rounded-lg border border-soft bg-elev px-3 py-1.5 text-xs text-main outline-none focus:border-accent-500"
        />
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as PMIUSort);
            setVisibleCount(50);
          }}
          className="rounded-lg border border-soft bg-elev px-2 py-1.5 text-xs text-main outline-none focus:border-accent-500"
        >
          <option value="name">Sort: A–Z</option>
          <option value="worst_ratio">Sort: worst ratio first</option>
        </select>
      </div>

      <div className="text-[11px] text-faint">
        {filtered.length.toLocaleString()} match{filtered.length === 1 ? "" : "es"}
        {search && ` for "${search}"`} — {sort === "name" ? "sorted A–Z" : "sorted worst tail ratio first"}
      </div>

      <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
        {visible.length === 0 && <EmptyHint>No real channel matches that search.</EmptyHint>}
        {visible.map((c) => (
          <div
            key={c.channel_id}
            className="flex items-center justify-between gap-2 rounded-lg border border-soft bg-elev px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-main">{c.name}</div>
              <div className="mt-0.5 text-[10.5px] text-faint">
                design {c.design_discharge_cusecs ?? "n/a"} cusecs · tail gauge{" "}
                {c.current_tail_gauge_ft.toFixed(2)}ft / {c.authorized_tail_gauge_ft.toFixed(2)}ft
                authorized
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="tnum text-xs font-semibold text-main">
                {c.tail_gauge_ratio.toFixed(2)}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  PMIU_STATUS_CLASS[c.status] ?? "text-faint bg-elev-2 border-soft"
                }`}
              >
                {c.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {visibleCount < filtered.length && (
        <button
          onClick={() => setVisibleCount((n) => n + 50)}
          className="w-full rounded-lg border border-soft py-1.5 text-xs text-dim hover:text-main"
        >
          Show 50 more ({filtered.length - visibleCount} remaining)
        </button>
      )}

      <LastComputed iso={pmiu.last_computed_utc} note={pmiu.refresh_cadence_note} />
    </div>
  );
}

export default function ExplorePanel({
  layerId,
  data,
  selectedDistrict,
  cropPick,
  onCropPickChange,
  canalPick,
  onCanalPickChange,
  triggerThreshold,
  onTriggerThresholdChange,
  hazardsView,
  onHazardsViewChange,
}: {
  layerId: LayerId;
  data: DataBundle;
  selectedDistrict: string | null;
  cropPick: Crop;
  onCropPickChange: (c: Crop) => void;
  canalPick: string;
  onCanalPickChange: (id: string) => void;
  triggerThreshold: "national" | "demo";
  onTriggerThresholdChange: (t: "national" | "demo") => void;
  hazardsView: "live" | "forecast";
  onHazardsViewChange: (v: "live" | "forecast") => void;
}) {
  const meta = LAYERS[layerId];
  const { locale } = useAppLocale();
  const groupLabel = GROUP_LABEL_UR[meta.group] ?? meta.group;

  return (
    <div className="flex flex-col gap-4">
      <div>
        {meta.group && (
          <div className={`font-mono text-[10.5px] uppercase tracking-wide text-faint ${locale === "ur" ? "urdu-text normal-case" : ""}`}>
            {locale === "ur" ? groupLabel : meta.group}
          </div>
        )}
        <h2
          className={`mt-0.5 text-base font-semibold text-main ${locale === "ur" ? "urdu-text" : ""}`}
          dir={locale === "ur" ? "rtl" : undefined}
        >
          {locale === "ur" ? meta.labelUr : meta.label}
        </h2>
        <p
          className={`mt-1.5 max-w-[42ch] text-xs leading-relaxed text-dim ${locale === "ur" ? "urdu-text" : ""}`}
          dir={locale === "ur" ? "rtl" : undefined}
        >
          {locale === "ur" ? meta.aboutUr : meta.about}
        </p>
      </div>

      {layerId === "home" && <HomeDetail data={data} />}
      {layerId === "hazards" && (
        <HazardsDetail data={data} district={selectedDistrict} hazardsView={hazardsView} onHazardsViewChange={onHazardsViewChange} />
      )}
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
      {layerId === "models" && (
        <div className="space-y-6">
          <ModelsDetail data={data} />
          <div>
            <h3 className="text-base font-semibold text-main">History</h3>
            <p className="mt-1 text-xs text-dim">
              Real cross-year and cross-event generalization tests, browsable as event cards — fire, flood,
              locust, and crop models checked against real years/events they weren&apos;t trained on.
            </p>
            <div className="mt-3">
              <HistoryDetail data={data} />
            </div>
          </div>
        </div>
      )}
      {layerId === "register" && <FarmSubmissionForm />}
      {layerId === "locust" && (
        <div className="space-y-3">
          <div className="caveat-banner">
            <strong>What stays fixed across every region:</strong> the same two real
            thresholds and the same confidence formula are applied everywhere --
            soil favorable at anomaly &ge; 0.02 m&sup3;/m&sup3;, vegetation "not
            browning" at NDVI delta &ge; -0.05, and confidence = 0.35 base +0.30 if
            soil favorable +0.30 if not browning. Only the live satellite readings
            each region feeds into that fixed formula actually vary -- shown below
            per region, not the formula itself.
          </div>
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

              <p className="provenance-line mt-1 !border-t-0 !pt-0 !mt-1">Live satellite readings (vary by region)</p>
              <Row k="Soil moisture (recent)" v={r.sm_surface_m3m3 != null ? `${r.sm_surface_m3m3} m³/m³` : "n/a"} />
              <Row k="Soil moisture anomaly" v={r.sm_surface_anomaly_m3m3 != null ? `${r.sm_surface_anomaly_m3m3 >= 0 ? "+" : ""}${r.sm_surface_anomaly_m3m3} m³/m³` : "n/a"} />
              <Row k="NDVI (last 30d)" v={r.ndvi_recent_30d != null ? String(r.ndvi_recent_30d) : "n/a"} />
              <Row k="NDVI (prior 30d)" v={r.ndvi_prior_30d != null ? String(r.ndvi_prior_30d) : "n/a"} />
              <Row k="NDVI delta" v={r.ndvi_delta != null ? `${r.ndvi_delta >= 0 ? "+" : ""}${r.ndvi_delta}` : "n/a"} />

              <p className="provenance-line mt-2 !border-t-0 !pt-0 !mt-1">Fixed formula applied to those readings</p>
              <Row k="Soil damp enough? (anomaly &ge; 0.02)" v={r.soil_favorable_for_egglaying ? "Yes" : "No"} />
              <Row k="Vegetation not browning? (delta &ge; -0.05)" v={r.vegetation_not_browning ? "Yes" : "No"} />
              <div className="mt-2 rounded-lg bg-elev-2 px-3 py-2 text-[11px] text-dim">
                <div className="flex items-center justify-between font-mono tnum">
                  <span>0.35 base</span>
                  <span>+ {r.soil_favorable_for_egglaying ? "0.30" : "0.00"} soil</span>
                  <span>+ {r.vegetation_not_browning ? "0.30" : "0.00"} vegetation</span>
                  <span className="font-semibold text-main">= {Math.round(r.confidence * 100)}%</span>
                </div>
              </div>
            </div>
          ))}
          <LastComputed iso={data.locust?.last_computed_utc} note={data.locust?.refresh_cadence_note} />
        </div>
      )}
      {layerId === "canal" && data.water && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {data.water.canals.map((c) => (
              <button
                key={c.canal_id}
                onClick={() => onCanalPickChange(c.canal_id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  c.canal_id === canalPick
                    ? "border-accent-500 bg-accent-soft text-accent-500 font-semibold"
                    : "border-soft text-dim hover:text-main"
                }`}
              >
                {c.canal_name}
              </button>
            ))}
          </div>
          {(() => {
            const canal = data.water!.canals.find((c) => c.canal_id === canalPick) ?? data.water!.canals[0];
            if (!canal) return <EmptyHint>No canal data.</EmptyHint>;
            return (
              <div className="rounded-xl border border-soft bg-elev p-4">
                <h3 className="text-sm font-semibold text-main">{canal.canal_name}</h3>
                <Row k="Real OSM length" v={canal.geometry_source.match(/([\d.]+) km total/)?.[1] ? `${canal.geometry_source.match(/([\d.]+) km total/)?.[1]} km` : "n/a"} />
                <Row k="Segments with valid index" v={`${canal.n_segments_with_valid_index} / ${canal.n_segments}`} />
                <Row
                  k="Head stress index"
                  v={canal.head_vs_tail.head_stress_index != null ? canal.head_vs_tail.head_stress_index.toFixed(3) : "n/a"}
                />
                <Row
                  k="Tail stress index"
                  v={canal.head_vs_tail.tail_stress_index != null ? canal.head_vs_tail.tail_stress_index.toFixed(3) : "n/a"}
                />
                <Row k="Flow direction (real SRTM check)" v={canal.head_vs_tail.flow_direction_verdict} />
                <Caveat>{canal.scope}</Caveat>
              </div>
            );
          })()}
          <PMIUChannelExplorer data={data} />
        </div>
      )}
    </div>
  );
}
