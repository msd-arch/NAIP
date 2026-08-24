"use client";

import { useEffect, useState } from "react";
import CaveatBanner from "../components/CaveatBanner";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface AuditRecord {
  event_id: string; district: string; date: string; hazard: string;
  hazard_confidence: number; crop: string; crop_stage: string;
  exposure_score: number; threshold: number;
  crop_mix_source?: string; crop_mix_share_of_4crop_area?: number | null;
  n_real_farms_matched_in_district: number; matched_farm_ids: string[];
  basis_risk_note: string;
  payout: { status: string; note: string; amount: null; transaction_id: null };
}

const TIER_TAG: Record<string, { label: string; className: string }> = {
  real_district_area: { label: "real MNFSR (2022-23)", className: "text-accent-500" },
  model_estimated_interim: { label: "model-estimated interim", className: "text-warn" },
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

      <CaveatBanner>
        &ldquo;A trigger is a reason to investigate or pay against an index, not proof
        that any specific farmer actually lost anything.&rdquo; &mdash; FINAL_REPORT.md.
        Payout is always <strong>STUBBED_INTENT_ONLY</strong>: Raast (SBP instant-payment
        rail) is an integration point only, no real money has ever moved through this
        system, no transaction ID has ever been real.
      </CaveatBanner>

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
          Demo threshold (0.07)
        </button>
      </div>

      <p className="mt-2 text-[11px] text-faint">
        Recalibrated Week 9: the old 0.35/0.20 thresholds were matched to their real
        selectivity against the rescaled score distribution after crop_weight became a
        real proportional weight (see Exposure Risk) &mdash; not picked to hit a target
        event count.
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
        <div className="max-h-[480px] overflow-y-auto rounded-xl border border-soft">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-elev-2 text-left text-faint">
              <tr>
                <th className="p-2">District</th><th className="p-2">Hazard</th>
                <th className="p-2">Crop</th><th className="p-2">Crop-mix source</th>
                <th className="p-2">Score</th><th className="p-2">Farms</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr
                  key={r.event_id}
                  onClick={() => setSelected(r)}
                  className={`cursor-pointer border-t border-soft hover:bg-elev-2 ${selected?.event_id === r.event_id ? "bg-elev-2" : ""}`}
                >
                  <td className="p-2">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-critical" title="fired trigger event" />
                    {r.district}
                  </td>
                  <td className="p-2">{r.hazard.replace("_", " ")}</td>
                  <td className="p-2">{r.crop}</td>
                  <td className={`p-2 text-[11px] ${TIER_TAG[r.crop_mix_source ?? ""]?.className ?? "text-faint"}`}>
                    {TIER_TAG[r.crop_mix_source ?? ""]?.label ?? r.crop_mix_source ?? "—"}
                  </td>
                  <td className="p-2 tnum">{r.exposure_score}</td>
                  <td className={`p-2 tnum ${r.n_real_farms_matched_in_district > 0 ? "text-accent-500" : "text-faint"}`}>
                    {r.n_real_farms_matched_in_district}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <Row k="Real farms matched" v={`${selected.n_real_farms_matched_in_district}`} />
              </dl>
              {selected.crop_mix_source === "model_estimated_interim" && (
                <p className="mt-2 text-[11px] text-warn">
                  This event&apos;s crop-mix weight came from Track F&apos;s trained model&apos;s real
                  prediction, not a government survey &mdash; genuinely unvalidatable until a future
                  real MNFSR report arrives to check it against.
                </p>
              )}

              <div className="caveat-banner mt-4">
                <strong>Basis risk (verbatim from the audit record):</strong>
                <p className="mt-1 text-dim">{selected.basis_risk_note}</p>
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
