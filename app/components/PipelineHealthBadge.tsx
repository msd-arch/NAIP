"use client";

import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface Health {
  generated_utc: string;
  status: "ok" | "no_new_scene" | "error";
  detail: string;
  last_cycle_duration_seconds: number | null;
  last_scene_processed: string | null;
  last_success_utc: string | null;
  last_success_scene: string | null;
  n_success: number;
  n_failure: number;
  n_no_new_scene: number;
  min_latency_hours_tier: number;
  windows_uptime_caveat: string;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function PipelineHealthBadge() {
  const [health, setHealth] = useState<Health | null>(null);
  const [showCaveat, setShowCaveat] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/data/pipeline_health.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  if (!health) {
    return (
      <div className="rounded-lg border border-soft bg-elev-2 px-3 py-2 text-xs text-faint">
        Live Data Pipeline: status unavailable &mdash; pipeline_health.json not found.
      </div>
    );
  }

  const dotColor =
    health.status === "ok" ? "bg-accent-500" : health.status === "error" ? "bg-critical" : "bg-[#b5651d]";

  return (
    <div className="rounded-lg border border-soft bg-elev-2 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 font-medium text-main">
          <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
          Live Data Pipeline
        </span>
        <span className="text-dim">
          Last successful real cycle: <span className="tnum text-main">{timeAgo(health.last_success_utc)}</span>
        </span>
        <span className="text-faint">
          {health.n_success} succeeded / {health.n_failure} failed / {health.n_no_new_scene} no-new-scene
        </span>
        <button
          onClick={() => setShowCaveat((s) => !s)}
          className="text-faint underline underline-offset-2 hover:text-dim"
        >
          {showCaveat ? "hide" : "details"}
        </button>
      </div>
      {showCaveat && (
        <p className="mt-1.5 text-[11px] text-faint">
          Live nowcasting loop (internally &ldquo;Track H&rdquo;). {health.windows_uptime_caveat}
        </p>
      )}
    </div>
  );
}
