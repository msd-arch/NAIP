"use client";

interface Segment {
  dist_from_head_km: number;
  stress_index: number | null;
  elevation_m_srtm: number | null;
}

/** Lightweight dependency-free dual-axis line chart (stress index + elevation
    vs. distance along the canal). No charting library needed for 24 points. */
export default function SegmentProfileChart({ segments }: { segments: Segment[] }) {
  const valid = segments.filter((s) => s.stress_index !== null && s.elevation_m_srtm !== null);
  const w = 640, h = 220, pad = 36;
  const maxDist = Math.max(...valid.map((s) => s.dist_from_head_km));
  const stressVals = valid.map((s) => s.stress_index as number);
  const elevVals = valid.map((s) => s.elevation_m_srtm as number);
  const sMin = Math.min(...stressVals), sMax = Math.max(...stressVals);
  const eMin = Math.min(...elevVals), eMax = Math.max(...elevVals);

  const x = (d: number) => pad + (d / maxDist) * (w - 2 * pad);
  const ys = (v: number) => h - pad - ((v - sMin) / (sMax - sMin || 1)) * (h - 2 * pad);
  const ye = (v: number) => h - pad - ((v - eMin) / (eMax - eMin || 1)) * (h - 2 * pad);

  const stressPath = valid.map((s, i) => `${i === 0 ? "M" : "L"}${x(s.dist_from_head_km)},${ys(s.stress_index as number)}`).join(" ");
  const elevPath = valid.map((s, i) => `${i === 0 ? "M" : "L"}${x(s.dist_from_head_km)},${ye(s.elevation_m_srtm as number)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--border)" />
      <text x={pad} y={h - 8} fontSize="10" fill="var(--text-faint)">head (0km)</text>
      <text x={w - pad - 60} y={h - 8} fontSize="10" fill="var(--text-faint)">tail ({maxDist.toFixed(0)}km)</text>

      <path d={elevPath} fill="none" stroke="#4da3ff" strokeWidth={2} opacity={0.85} />
      <path d={stressPath} fill="none" stroke="#ef4444" strokeWidth={2} />

      <text x={pad} y={14} fontSize="10" fill="#ef4444">stress index (1 - ET/PET)</text>
      <text x={pad} y={28} fontSize="10" fill="#4da3ff">real SRTM elevation (m)</text>
    </svg>
  );
}
