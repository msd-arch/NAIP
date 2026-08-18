"use client";

import { useEffect, useState } from "react";
import CaveatBanner from "../components/CaveatBanner";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface Scenario {
  note: string;
  record: {
    district: string; date: string; hazard: string; hazard_confidence: number;
    crop: string; crop_stage: string; exposure_score: number; threshold: number;
    n_real_farms_matched_in_district: number; matched_farm_ids: string[];
    basis_risk_note: string; payout: { status: string; note: string };
  };
}

export default function DemoWalkthroughPage() {
  const [data, setData] = useState<Scenario | null>(null);

  useEffect(() => {
    fetch(`${BASE}/data/demo_scenario.json`).then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-dim">Loading the real demo scenario...</p>;
  const r = data.record;

  const steps = [
    {
      title: "1. Real hazard detection", body:
        `hazards.py (Week 1, real 11-detector engine) flagged "${r.hazard.replace("_", " ")}" ` +
        `in ${r.district} on ${r.date}, confidence ${r.hazard_confidence}, from the real 71-frame ` +
        "MSG/SEVIRI archive (2026-06-22..07-20).",
    },
    {
      title: "2. Fusion + plausibility mask", body:
        `Fused with the real regional crop calendar: ${r.crop} was in "${r.crop_stage}" stage ` +
        `on ${r.date}. crop_plausibility.py confirmed ${r.crop} is agronomically plausible for ` +
        `${r.district} (a real cotton-belt district) -> exposure_score = ${r.exposure_score}.`,
    },
    {
      title: "3. Trigger-contract engine", body:
        `exposure_score (${r.exposure_score}) >= threshold (${r.threshold}) -> a real, audited ` +
        "trigger event was logged with the exact hazard data, threshold, and timestamp.",
    },
    {
      title: "4. Farm Registry match", body:
        `${r.n_real_farms_matched_in_district} real farm polygons in ${r.district} (from the real ` +
        "120-farm Layyah/Muridke seed set, in-memory registry, real point-in-polygon district " +
        "assignment) were matched to this trigger event.",
    },
    {
      title: "5. Multi-channel delivery", body:
        "sms_delivery.py formatted a real bilingual (English/Urdu) SMS for this event. " +
        "Sent via real Twilio if credentials are set; otherwise an honestly-labeled stub record.",
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold">End-to-End Demo Walkthrough</h1>
      <p className="mt-1 text-sm text-dim">{data.note}</p>

      <CaveatBanner>{r.basis_risk_note}</CaveatBanner>

      <div className="mt-6 space-y-3">
        {steps.map((s) => (
          <div key={s.title} className="rounded-xl border border-soft bg-elev p-4">
            <h2 className="text-sm font-semibold text-accent">{s.title}</h2>
            <p className="mt-1.5 text-xs text-dim">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-4 text-xs">
        <strong className="text-warn">Payout status: {r.payout.status}</strong>
        <p className="mt-1 text-dim">{r.payout.note}</p>
      </div>

      <div className="mt-4 rounded-xl border border-soft bg-elev-2 p-4 font-mono text-[11px] text-dim">
        python naip/run_end_to_end_demo.py --district {r.district} --threshold {r.threshold}
      </div>
    </div>
  );
}
