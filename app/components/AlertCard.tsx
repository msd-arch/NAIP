"use client";

/** AQMS-style alert card: severity badge + confidence % + model name/version
    + "as of" date, one card per event. Used by the Trigger Engine event list. */
export default function AlertCard({
  title,
  subtitle,
  severity,
  confidencePct,
  modelLabel,
  asOf,
  tierLabel,
  tierClassName,
  selected,
  onClick,
}: {
  title: string;
  subtitle: string;
  severity: "critical" | "moderate";
  confidencePct: number;
  modelLabel: string;
  asOf: string;
  tierLabel: string;
  tierClassName: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        selected ? "border-accent-500 bg-accent-soft" : "border-soft bg-elev hover:bg-elev-2"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                severity === "critical" ? "bg-critical text-white" : "bg-secondary-500 text-white"
              }`}
            >
              {severity === "critical" ? "Trigger fired" : "Elevated"}
            </span>
            <span className={`text-[10px] font-medium ${tierClassName}`}>{tierLabel}</span>
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-main">{title}</div>
          <div className="text-xs text-dim">{subtitle}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="tnum text-sm font-semibold text-main">{confidencePct}%</div>
          <div className="text-[10px] text-faint">confidence</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-faint">
        <span>{modelLabel}</span>
        <span>&middot;</span>
        <span>as of {asOf}</span>
      </div>
    </button>
  );
}
