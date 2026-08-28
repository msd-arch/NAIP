"use client";

export function R2Bar({ crop, r2 }: { crop: string; r2: number }) {
  const clamped = Math.max(-1.5, Math.min(1, r2));
  const negative = clamped < 0;
  const widthPct = (Math.abs(clamped) / 1.5) * 50;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="capitalize text-dim">{crop}</span>
        <span className={`tnum font-semibold ${negative ? "text-critical" : "text-main"}`}>
          {r2.toFixed(3)} {negative && "(unreliable)"}
        </span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-elev-2">
        <div className="absolute left-1/2 top-0 h-full w-px bg-[var(--text)] opacity-40" />
        <div
          className={`absolute top-0 h-full rounded-full ${negative ? "bg-critical/70" : "bg-accent-500"}`}
          style={negative ? { right: "50%", width: `${widthPct}%` } : { left: "50%", width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

export function AccuracyBar({ label, value, baseline }: { label: string; value: number; baseline: number }) {
  const max = Math.max(value, baseline) * 1.15;
  const belowBaseline = value < baseline;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-dim">{label}</span>
        <span className="tnum font-semibold text-main">
          {(value * 100).toFixed(1)}% {belowBaseline && <span className="text-faint">(below baseline)</span>}
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-elev-2">
        <div
          className={`h-full rounded-full ${belowBaseline ? "bg-[#8c8878]" : "bg-accent-500"}`}
          style={{ width: `${(value / max) * 100}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-[var(--text)] opacity-60"
          style={{ left: `${(baseline / max) * 100}%` }}
          title={`baseline: ${(baseline * 100).toFixed(1)}%`}
        />
      </div>
    </div>
  );
}

export function YieldBar({ label, modelR2, naiveR2 }: { label: string; modelR2: number | null; naiveR2: number | null }) {
  const vals = [modelR2, naiveR2].filter((v): v is number => v != null);
  const maxAbs = Math.max(0.2, ...vals.map((v) => Math.abs(v)));
  const bar = (v: number | null, isBaseline: boolean) => {
    if (v == null) return <div className="h-2 w-full rounded-full bg-elev-2" />;
    const neg = v < 0;
    const widthPct = (Math.abs(v) / maxAbs) * 100;
    return (
      <div className="h-2 w-full rounded-full bg-elev-2">
        <div
          className={`h-full rounded-full ${isBaseline ? "bg-[#8c8878]" : neg ? "bg-critical/70" : "bg-accent-500"}`}
          style={{ width: `${Math.max(2, widthPct)}%` }}
        />
      </div>
    );
  };
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="capitalize text-dim">{label}</span>
        <span className="tnum text-faint">
          model {modelR2 != null ? modelR2.toFixed(3) : "—"} vs. simple guess {naiveR2 != null ? naiveR2.toFixed(3) : "—"}
        </span>
      </div>
      <div className="space-y-1">
        {bar(modelR2, false)}
        {bar(naiveR2, true)}
      </div>
    </div>
  );
}
