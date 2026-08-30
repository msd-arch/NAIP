"use client";

import { useEffect, useRef } from "react";

export type CropStressAnimKind = "level" | "senescence";

/** Real, lightweight canvas animation for the Crop Stress Screen popup --
    same "grounded in real detector output" discipline as HazardCanvas.tsx:
    every visual parameter here is driven by this district's own real point
    counts (out of Track M's real ~25-point-per-district sample grid), never
    an arbitrary stock animation. We don't have each real point's own
    lat/lon here (the screen only ships per-district aggregate counts), so
    "level" lays the real count out on a plain grid -- a genuine
    visualization of "N of 25 real sampled points came back anomalous,"
    not a claim about exactly where in the district they sit. */
export default function CropStressCanvas({
  kind,
  nPoints,
  nAnomalyPoints,
  width = 260,
  height = 130,
}: {
  kind: CropStressAnimKind;
  nPoints: number;
  nAnomalyPoints: number;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    let t = 0;
    const nP = Math.max(0, nPoints);
    const nA = Math.max(0, Math.min(nAnomalyPoints, nP));

    function frameLevel() {
      // Real per-point grid: nP real sampled points laid out on a simple
      // grid, the first nA (this district's real anomaly count) rendered
      // as pulsating thinning-foliage hotspots, the rest as steady healthy
      // green -- a direct real-count-to-dot mapping, not a fixed pattern.
      const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, nP))));
      const rows = Math.max(1, Math.ceil(nP / cols));
      const padX = 18;
      const padY = 14;
      const cellW = (width - padX * 2) / cols;
      const cellH = (height - padY * 2) / rows;

      ctx!.clearRect(0, 0, width, height);
      const grad = ctx!.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#eef1de");
      grad.addColorStop(1, "#e2e7cb");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, width, height);

      t += 1;
      for (let i = 0; i < nP; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = padX + cellW * (col + 0.5);
        const cy = padY + cellH * (row + 0.5);
        // Real anomaly points spread evenly through the index range rather
        // than clustered at the start -- purely a layout choice (we have
        // no real per-point location to plot), kept even so the pulsing
        // dots read as "scattered through the district," not bunched.
        const isAnomaly = nA > 0 && i % Math.max(1, Math.round(nP / nA)) === 0 && i < nA * Math.max(1, Math.round(nP / nA));
        if (isAnomaly) {
          const pulse = Math.sin(t * 0.08 + i) * 2;
          const r = 5 + pulse;
          const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r * 2.4);
          glow.addColorStop(0, "rgba(201,59,53,0.5)");
          glow.addColorStop(1, "rgba(201,59,53,0)");
          ctx!.fillStyle = glow;
          ctx!.beginPath();
          ctx!.arc(cx, cy, r * 2.4, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.fillStyle = "#c93b35";
          ctx!.beginPath();
          ctx!.arc(cx, cy, 3.5, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          ctx!.fillStyle = "rgba(74,143,60,0.55)";
          ctx!.beginPath();
          ctx!.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
      raf = requestAnimationFrame(frameLevel);
    }

    function lerp(a: number, b: number, f: number) {
      return a + (b - a) * f;
    }
    function lerpColor(a: number[], b: number[], f: number) {
      return `rgb(${Math.round(lerp(a[0], b[0], f))},${Math.round(lerp(a[1], b[1], f))},${Math.round(lerp(a[2], b[2], f))})`;
    }

    function frameSenescence() {
      // Real affected fraction: this district's own nA/nP (senescence-
      // anomaly points out of real sampled points) sets how far the
      // green-to-brown wipe actually extends -- a district with a larger
      // real senescence count gets a visibly wider browning band, not a
      // fixed-size effect.
      const frac = nP > 0 ? Math.min(1, nA / nP) : 0;
      const green = [116, 163, 87];
      const brown = [138, 109, 63];

      t += 1;
      ctx!.clearRect(0, 0, width, height);
      const sweep = (Math.sin(t * 0.02) + 1) / 2;
      for (let x = 0; x < width; x++) {
        const xf = x / width;
        let localF = 0;
        if (xf < frac) {
          const edge = frac > 0 ? xf / frac : 0;
          localF = Math.min(1, edge + sweep * 0.15);
        }
        ctx!.fillStyle = lerpColor(green, brown, localF);
        ctx!.fillRect(x, 0, 1.5, height);
      }
      if (frac > 0) {
        ctx!.strokeStyle = "rgba(43,42,36,0.4)";
        ctx!.setLineDash([4, 3]);
        ctx!.beginPath();
        ctx!.moveTo(width * frac, 0);
        ctx!.lineTo(width * frac, height);
        ctx!.stroke();
        ctx!.setLineDash([]);
      }
      raf = requestAnimationFrame(frameSenescence);
    }

    raf = requestAnimationFrame(kind === "level" ? frameLevel : frameSenescence);
    return () => cancelAnimationFrame(raf);
  }, [kind, nPoints, nAnomalyPoints, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height }}
      className="block w-full rounded-lg border border-soft"
      aria-label={kind === "level" ? "level anomaly point map" : "senescence-slope browning animation"}
    />
  );
}
