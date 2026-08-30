"use client";

import { useEffect, useRef } from "react";

/** Real, lightweight canvas animation for the Flood Risk Screen popup.
    Every parameter that can be grounded in a real per-district field is:
    the water-rise target height is this district's own real
    mean_model_score (0-1, clamped); the flow-particle density/speed is
    driven by the real |mean_precip_anomaly_pct| (a real, if indirect,
    proxy for how much water is moving through the system -- the model's
    own top permutation-importance feature per Track I's real result).

    What is NOT grounded in real data, and is labeled as such directly in
    FloodPopupContent's own caveat text (not just here): the flow
    DIRECTION and the specific "impacted zone" grid cells. Track
    D/I's real training data has no per-district flow-direction field
    (unlike the canal-water-stress module, which has a real SRTM
    elevation cross-check) and no sub-district inundation-extent geometry
    at all -- a single real score per whole district is all that exists.
    Direction and cell placement here are illustrative motion/layout, not
    a claim about where floodwater actually goes inside the district. */
export default function FloodCanvas({
  modelScore,
  precipAnomalyPct,
  width = 260,
  height = 150,
}: {
  modelScore: number;
  precipAnomalyPct: number | null;
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

    const score = Math.max(0, Math.min(1, modelScore));
    const anomaly = precipAnomalyPct != null ? Math.abs(precipAnomalyPct) : 40;
    const flowDensity = Math.max(4, Math.min(22, Math.round(anomaly / 12)));
    const flowSpeed = Math.max(0.4, Math.min(2.2, anomaly / 100));

    // Real per-district score picks how many of the illustrative grid
    // cells (a stand-in for "low-lying zones", not real geometry) are
    // drawn as flagged -- more of the grid highlighted for a higher real
    // score, not a fixed count.
    const cols = 6, rows = 4;
    const nCells = cols * rows;
    const nFlagged = Math.round(score * nCells);
    const cellOrder = Array.from({ length: nCells }, (_, i) => i).sort((a, b) => {
      // bias toward the lower rows (closer to the water) so flagged cells
      // read as "low-lying," a real, defensible ordering choice even
      // though exact cell identity is illustrative
      const rowOf = (i: number) => Math.floor(i / cols);
      return rowOf(b) - rowOf(a) || a - b;
    });
    const flaggedSet = new Set(cellOrder.slice(0, nFlagged));

    interface FlowP { x: number; y: number; life: number; maxLife: number }
    const flow: FlowP[] = Array.from({ length: flowDensity }, () => spawnFlow());
    function spawnFlow(): FlowP {
      return { x: -10, y: height * (0.55 + Math.random() * 0.4), life: 0, maxLife: 200 + Math.random() * 120 };
    }

    let raf = 0;
    let t = 0;

    function frame() {
      t += 1;
      ctx!.clearRect(0, 0, width, height);

      // terrain
      const terrainGrad = ctx!.createLinearGradient(0, 0, 0, height);
      terrainGrad.addColorStop(0, "#e9e4d4");
      terrainGrad.addColorStop(1, "#d9d0b8");
      ctx!.fillStyle = terrainGrad;
      ctx!.fillRect(0, 0, width, height);

      // illustrative low-lying grid + impacted-zone overlay
      const cellW = width / cols, cellH = (height * 0.7) / rows;
      const gridTop = height * 0.3;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const x = c * cellW, y = gridTop + r * cellH;
          if (flaggedSet.has(idx)) {
            ctx!.fillStyle = "rgba(201,59,53,0.10)";
            ctx!.fillRect(x, y, cellW, cellH);
            ctx!.strokeStyle = "rgba(201,59,53,0.55)";
            ctx!.setLineDash([3, 2]);
            ctx!.lineWidth = 1.2;
            ctx!.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
            ctx!.setLineDash([]);
          }
        }
      }

      // rising water fill, wavy top edge, target height from the real score
      const targetY = height - height * 0.62 * score;
      const bob = Math.sin(t * 0.03) * 3;
      const waterTop = targetY + bob;
      ctx!.save();
      ctx!.beginPath();
      ctx!.moveTo(0, height);
      for (let x = 0; x <= width; x += 8) {
        ctx!.lineTo(x, waterTop + Math.sin(x * 0.08 + t * 0.05) * 3);
      }
      ctx!.lineTo(width, height);
      ctx!.closePath();
      ctx!.clip();
      const waterGrad = ctx!.createLinearGradient(0, waterTop, 0, height);
      waterGrad.addColorStop(0, "rgba(74,122,148,0.55)");
      waterGrad.addColorStop(1, "rgba(43,84,110,0.85)");
      ctx!.fillStyle = waterGrad;
      ctx!.fillRect(0, 0, width, height);

      // flow velocity particles -- illustrative direction (down-and-right),
      // real density/speed from |precip anomaly|
      ctx!.strokeStyle = "rgba(255,255,255,0.55)";
      ctx!.lineWidth = 1.4;
      ctx!.lineCap = "round";
      for (const p of flow) {
        p.life += 1;
        p.x += flowSpeed * 1.6;
        p.y += flowSpeed * 0.25;
        if (p.x > width + 10 || p.life > p.maxLife) Object.assign(p, spawnFlow());
        ctx!.beginPath();
        ctx!.moveTo(p.x, p.y);
        ctx!.lineTo(p.x - 10, p.y - 2.5);
        ctx!.stroke();
        // small arrowhead
        ctx!.beginPath();
        ctx!.moveTo(p.x, p.y);
        ctx!.lineTo(p.x - 3, p.y - 2);
        ctx!.moveTo(p.x, p.y);
        ctx!.lineTo(p.x - 3, p.y + 1.5);
        ctx!.stroke();
      }
      ctx!.restore();

      // water-line marker
      ctx!.strokeStyle = "rgba(43,42,36,0.35)";
      ctx!.setLineDash([4, 3]);
      ctx!.beginPath();
      ctx!.moveTo(0, waterTop);
      ctx!.lineTo(width, waterTop);
      ctx!.stroke();
      ctx!.setLineDash([]);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [modelScore, precipAnomalyPct, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height }}
      className="block w-full rounded-lg border border-soft"
      aria-label="flood inundation and flow simulation"
    />
  );
}
