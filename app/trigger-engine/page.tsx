"use client";

import { useEffect, useState } from "react";
import CaveatBanner from "../components/CaveatBanner";
import DisclaimerBar from "../components/DisclaimerBar";
import AlertCard from "../components/AlertCard";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface AuditRecord {
  event_id: string; district: string; date: string; hazard: string;
  hazard_confidence: number; crop: string; crop_stage: string;
  exposure_score: number; threshold: number;
  crop_mix_source?: string; crop_mix_share_of_4crop_area?: number | null;
  interim_confidence_multiplier?: number; exposure_score_before_confidence_discount?: number;
  n_real_farms_matched_in_district: number; matched_farm_ids: string[];
  basis_risk_note: string;
  payout: { status: string; note: string; amount: null; transaction_id: null };
}

const TIER_TAG: Record<string, { label: string; className: string }> = {
  real_district_area: { label: "real MNFSR (2022-23)", className: "text-accent-500" },
  model_estimated_interim: { label: "model-estimated interim", className: "text-secondary-500" },
  hand_classified_mask: { label: "hand-classified mask", className: "text-faint" },
};

interface Summary {
  threshold: number; threshold_note: string; n_triggered: number;
  n_triggered_with_real_farms_matched: number;
}

export default function TriggerEnginePage() {
  const [threshold, setThreshold] = useState<"national" | "demo">("national");
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<AuditRecord | null>(null);

  useEffect(() => {
    const file = threshold === "national" ? "audit_log_national.json" : "audit_log_demo.json";
    const sumFile = threshold === "national" ? "trigger_summary_national.json" : "trigger_summary_demo.json";
    fetch(`${BASE}/data/${file}`).then((r) => r.json()).then((d) => { setRecords(d); setSelected(d[0] ?? null); });
    fetch(`${BASE}/data/${sumFile}`).then((r) => r.json()).then(setSummary);
  }, [threshold]);

  const nMatched = records.filter((r) => r.n_real_farms_matched_in_district > 0).length;

  return (
    <div>
      <h1 className="text-xl font-semibold">Insurance Trigger-Contract Engine</h1>
      <p className="mt-1 text-sm text-dim">
        Real, audited trigger events: exposure_score &ge; threshold AND agronomically
        plausible. Every event is logged with the exact hazard reading that caused it.
      </p>

      <DisclaimerBar>
        &ldquo;A trigger is a reason to investigate or pay against an index, not proof
        that any specific farmer actually lost anything.&rdquo; &mdash; FINAL_REPORT.md.
        Payout is always <strong>STUBBED_INTENT_ONLY</strong>: Raast (SBP instant-payment
        rail) is an integration point only, no real money has ever moved through this
        system, no transaction ID has ever been real.
      </DisclaimerBar>

      <div className="mt-4 flex gap-5 border-b border-soft">
        <button
          onClick={() => setThreshold("national")}
          className={`border-b-2 pb-2 text-xs font-medium transition-colors ${threshold === "national" ? "border-accent-500 text-accent-500" : "border-transparent text-faint hover:text-dim"}`}
        >
          National threshold (0.225)
        </button>
        <button
          onClick={() => setThreshold("demo")}
          className={`border-b-2 pb-2 text-xs font-medium transition-colors ${threshold === "demo" ? "border-accent-500 text-accent-500" : "border-transparent text-faint hover:text-dim"}`}
        >
          Demo threshold (0.0216)
        </button>
      </div>

      <p className="mt-2 text-[11px] text-faint">
        Recalibrated once when crop_weight became a real proportional weight
        (0.35/0.20 &rarr; 0.225/0.07), and again after model_estimated_interim rows
        started carrying a real per-crop confidence discount (demo: 0.07 &rarr; 0.0216,
        re-matched to the same real selectivity against the score distribution &mdash; see
        Exposure Risk) &mdash; never picked to hit a target event count or preserve a
        specific scenario.
      </p>

      {summary && (
        <p className="mt-2 text-xs text-warn">{summary.threshold_note}</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-4 text-center sm:grid-cols-3">
        <Stat label="Trigger events" value={String(records.length)} />
        <Stat label="Matched real farms" value={`${nMatched} / ${records.length}`} tone={nMatched > 0 ? "accent" : undefined} />
        <Stat label="No farm coverage" value={`${records.length - nMatched} / ${records.length}`} />
      </div>
      {nMatched === 0 && records.length > 0 && (
        <p className="mt-2 text-center text-xs text-faint">
          0 of {records.length} national trigger events matched any real farm &mdash; not a
          bug: the 120-farm seed only covers 4 of 126 districts.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="max-h-[480px] space-y-2 overflow-y-auto rounded-xl border border-soft bg-elev-2 p-2">
          {records.map((r) => (
            <AlertCard
              key={r.event_id}
              title={`${r.district} · ${r.hazard.replace("_", " ")} × ${r.crop}`}
              subtitle={`Crop-mix: ${TIER_TAG[r.crop_mix_source ?? ""]?.label ?? r.crop_mix_source ?? "—"} · ${r.n_real_farms_matched_in_district} real farm${r.n_real_farms_matched_in_district === 1 ? "" : "s"} matched`}
              severity="critical"
              confidencePct={Math.round(r.hazard_confidence * 100)}
              modelLabel={`Trigger Engine · score ${r.exposure_score}`}
              asOf={r.date}
              tierLabel={TIER_TAG[r.crop_mix_source ?? ""]?.label ?? r.crop_mix_source ?? "—"}
              tierClassName={TIER_TAG[r.crop_mix_source ?? ""]?.className ?? "text-faint"}
              selected={selected?.event_id === r.event_id}
              onClick={() => setSelected(r)}
            />
          ))}
          <p className="provenance-line px-1">
            trigger_engine.py audit log &mdash; regenerated each pipeline run
          </p>
        </div>

        <div className="rounded-xl border border-soft bg-elev p-4">
          {selected ? (
            <div>
              <h2 className="text-sm font-semibold">
                {selected.district} &middot; {selected.date} &middot; {selected.hazard.replace("_", " ")} &times; {selected.crop}
              </h2>
              <dl className="mt-3 space-y-1.5 text-xs">
                <Row k="Hazard confidence" v={selected.hazard_confidence.toString()} />
                <Row k="Crop stage" v={selected.crop_stage} />
                <Row k="Exposure score" v={`${selected.exposure_score} (threshold ${selected.threshold})`} />
                <Row
                  k="Crop-mix source"
                  v={TIER_TAG[selected.crop_mix_source ?? ""]?.label ?? selected.crop_mix_source ?? "—"}
                />
                {selected.crop_mix_share_of_4crop_area != null && (
                  <Row k="Real crop-mix share" v={`${(selected.crop_mix_share_of_4crop_area * 100).toFixed(2)}%`} />
                )}
                {(selected.interim_confidence_multiplier ?? 1) < 1 && (
                  <>
                    <Row
                      k="Raw score (before confidence discount)"
                      v={`${selected.exposure_score_before_confidence_discount}`}
                    />
                    <Row
                      k={`Confidence multiplier (${selected.crop} R²)`}
                      v={`×${selected.interim_confidence_multiplier?.toFixed(4)}`}
                    />
                  </>
                )}
                <Row k="Real farms matched" v={`${selected.n_real_farms_matched_in_district}`} />
              </dl>
              {selected.crop_mix_source === "model_estimated_interim" && (
                <p className="mt-2 text-[11px] text-warn">
                  This event&apos;s crop-mix weight came from the trained national crop-share
                  model&apos;s real prediction, not a government survey &mdash; genuinely unvalidatable until a future
                  real MNFSR report arrives to check it against. Its score is also discounted by a
                  real, per-crop confidence multiplier (&times;{selected.interim_confidence_multiplier?.toFixed(3)}
                  {" "}for {selected.crop}) &mdash; the mean of that model&apos;s own validated cross-year
                  R&sup2; for this crop, applied directly with no further transform.
                </p>
              )}

              <div className="caveat-banner mt-4">
                <strong>Basis risk (verbatim from the audit record):</strong>
                <p className="mt-1 text-[11px] italic text-faint">
                  Kept verbatim for auditability &mdash; this is the exact text the trigger
                  engine wrote to the audit log, including its own internal references,
                  unedited.
                </p>
                <p className="mt-1.5 text-dim">{selected.basis_risk_note}</p>
              </div>

              <div className="mt-3 rounded-lg border border-soft bg-elev-2 p-3 text-xs">
                <strong>Payout status: {selected.payout.status}</strong>
                <p className="mt-1 text-dim">{selected.payout.note}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-faint">No trigger events at this threshold.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "accent" | "critical" }) {
  const color = tone === "accent" ? "text-accent-500" : tone === "critical" ? "text-critical" : "text-main";
  return (
    <div className="rounded-xl border border-soft bg-elev p-3">
      <div className={`tnum text-lg font-semibold ${color}`}>{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-soft py-1">
      <span className="text-dim">{k}</span>
      <span className="tnum font-medium">{v}</span>
    </div>
  );
}
