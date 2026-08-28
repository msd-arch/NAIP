"use client";

import { useEffect, useState } from "react";
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
  real_district_area: { label: "real government data", className: "text-accent-500" },
  model_estimated_interim: { label: "model's best guess", className: "text-secondary-500" },
  hand_classified_mask: { label: "manual estimate", className: "text-faint" },
};

export default function TriggerEnginePage() {
  const [threshold, setThreshold] = useState<"national" | "demo">("national");
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [selected, setSelected] = useState<AuditRecord | null>(null);

  useEffect(() => {
    const file = threshold === "national" ? "audit_log_national.json" : "audit_log_demo.json";
    fetch(`${BASE}/data/${file}`).then((r) => r.json()).then((d) => { setRecords(d); setSelected(d[0] ?? null); });
  }, [threshold]);

  const nMatched = records.filter((r) => r.n_real_farms_matched_in_district > 0).length;

  return (
    <div>
      <h1 className="text-xl font-semibold">Insurance Trigger Engine</h1>
      <p className="mt-2 text-sm text-dim">
        This checks every hazard alert and decides if it&apos;s serious enough to count as an
        insurance &ldquo;trigger.&rdquo; A trigger is a reason to look into a possible payout
        &mdash; it doesn&apos;t prove any specific farmer actually lost their crop.
      </p>

      <div className="mt-4 flex gap-5 border-b border-soft">
        <button
          onClick={() => setThreshold("national")}
          className={`border-b-2 pb-2 text-xs font-medium transition-colors ${threshold === "national" ? "border-accent-500 text-accent-500" : "border-transparent text-faint hover:text-dim"}`}
        >
          Strict threshold
        </button>
        <button
          onClick={() => setThreshold("demo")}
          className={`border-b-2 pb-2 text-xs font-medium transition-colors ${threshold === "demo" ? "border-accent-500 text-accent-500" : "border-transparent text-faint hover:text-dim"}`}
        >
          Looser threshold
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4 text-center sm:grid-cols-3">
        <Stat label="Trigger events" value={String(records.length)} />
        <Stat label="Matched to real farms" value={`${nMatched} / ${records.length}`} tone={nMatched > 0 ? "accent" : undefined} />
        <Stat label="No farm on record" value={`${records.length - nMatched} / ${records.length}`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="max-h-[480px] space-y-2 overflow-y-auto rounded-xl border border-soft bg-elev-2 p-2">
          {records.map((r) => (
            <AlertCard
              key={r.event_id}
              title={`${r.district} · ${r.hazard.replace("_", " ")} × ${r.crop}`}
              subtitle={`Crop data: ${TIER_TAG[r.crop_mix_source ?? ""]?.label ?? r.crop_mix_source ?? "—"} · ${r.n_real_farms_matched_in_district} real farm${r.n_real_farms_matched_in_district === 1 ? "" : "s"} matched`}
              severity="critical"
              confidencePct={Math.round(r.hazard_confidence * 100)}
              modelLabel={`score ${r.exposure_score}`}
              asOf={r.date}
              tierLabel={TIER_TAG[r.crop_mix_source ?? ""]?.label ?? r.crop_mix_source ?? "—"}
              tierClassName={TIER_TAG[r.crop_mix_source ?? ""]?.className ?? "text-faint"}
              selected={selected?.event_id === r.event_id}
              onClick={() => setSelected(r)}
            />
          ))}
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
                <Row k="Score" v={`${selected.exposure_score}`} />
                <Row
                  k="Crop data source"
                  v={TIER_TAG[selected.crop_mix_source ?? ""]?.label ?? selected.crop_mix_source ?? "—"}
                />
                <Row k="Real farms matched" v={`${selected.n_real_farms_matched_in_district}`} />
              </dl>

              <div className="mt-4 rounded-lg border border-soft bg-elev-2 p-3">
                <strong className="text-xs">Basis risk (verbatim from the audit record):</strong>
                <p className="mt-1 text-[11px] italic text-faint">
                  Kept exactly as written for record-keeping &mdash; unedited.
                </p>
                <p className="mt-1.5 text-xs text-dim">{selected.basis_risk_note}</p>
              </div>

              <div className="mt-3 rounded-lg border border-soft bg-elev-2 p-3 text-xs">
                <strong>Payout status: {selected.payout.status}</strong>
                <p className="mt-1 text-dim">No real money moves through this system &mdash; every payout here is a test record, not a real transaction.</p>
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
