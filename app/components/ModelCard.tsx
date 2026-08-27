"use client";

interface ComparisonBar {
  label: string;
  value: number;
  isBaseline?: boolean;
  negative?: boolean;
}

/** AQMS Forecast-page-style model card: confidence badge, a plain-language
    description of training data/method, and a comparison chart against a
    baseline. Bars can go negative -- shown honestly, not clipped. */
export default function ModelCard({
  name,
  version,
  confidenceLabel,
  confidenceTone = "moderate",
  trainedOn,
  comparison,
  comparisonUnit,
  children,
}: {
  name: string;
  version: string;
  confidenceLabel: string;
  confidenceTone?: "high" | "moderate" | "low";
  trainedOn: string;
  comparison: ComparisonBar[];
  comparisonUnit?: string;
  children?: React.ReactNode;
}) {
  const toneClass = {
    high: "bg-accent-500 text-white",
    moderate: "bg-secondary-500 text-white",
    low: "bg-[#8c8878] text-white",
  }[confidenceTone];

  const maxAbs = Math.max(1e-6, ...comparison.map((c) => Math.abs(c.value)));

  return (
    <div className="rounded-xl border border-soft bg-elev p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-main">{name}</h3>
          <p className="text-[11px] text-faint">{version}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${toneClass}`}>
          {confidenceLabel}
        </span>
      </div>

      <p className="mt-2 text-xs text-dim">{trainedOn}</p>

      <div className="mt-3 space-y-2">
        {comparison.map((c) => {
          const neg = c.negative ?? c.value < 0;
          const widthPct = (Math.abs(c.value) / maxAbs) * 100;
          return (
            <div key={c.label}>
              <div className="mb-0.5 flex justify-between text-[11px]">
                <span className={c.isBaseline ? "text-faint" : "text-dim"}>{c.label}</span>
                <span className={`tnum font-medium ${neg ? "text-critical" : c.isBaseline ? "text-faint" : "text-main"}`}>
                  {c.value.toFixed(3)}{comparisonUnit}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-elev-2">
                <div
                  className={`h-full rounded-full ${
                    c.isBaseline ? "bg-[#8c8878]" : neg ? "bg-critical/70" : "bg-accent-500"
                  }`}
                  style={{ width: `${Math.max(2, widthPct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {children && <div className="mt-3 text-[11px] text-faint">{children}</div>}
    </div>
  );
}
