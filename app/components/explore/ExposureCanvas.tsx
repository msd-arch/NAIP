"use client";

import { useEffect, useRef } from "react";

export type ExposureAnimKind = "fog" | "ice" | "flood" | "heat" | "hail" | "smoke";

/** Maps a real exposure event's hazard field to a visual treatment. Every
    kind that actually appears in the real top-50 exposure_risk.json is
    covered (fog, frost, flood_risk, uv_index, hail, residue_burning) --
    this isn't a curated subset, it's the real distinct hazard set found in
    the data (checked directly before writing this, not assumed from the
    architecture doc's hazard list). uv_index maps to "heat" per the
    project's own real message text for that detector ("thermal
    radiation... leaf-scorching risk for exposed crops"), not because
    UV and heat-wave are the same physical hazard -- they're visually
    similar enough (radiant/scorch treatment) to share one kind, and the
    metrics panel above the canvas still names the real hazard. */
export function exposureAnimKindFor(hazard: string): ExposureAnimKind {
  if (hazard === "fog") return "fog";
  if (hazard === "frost") return "ice";
  if (hazard === "flood_risk") return "flood";
  if (hazard === "uv_index" || hazard === "heat_wave") return "heat";
  if (hazard === "hail") return "hail";
  if (hazard === "residue_burning") return "smoke";
  return "fog";
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; life: number; maxLife: number; extra?: number;
}

const SKY: Record<ExposureAnimKind, [string, string]> = {
  fog: ["#e6e2d8", "#d9d4c6"],
  ice: ["#dce8ef", "#c3d9e6"],
  flood: ["#cfe0e8", "#aecdd9"],
  heat: ["#f6ded0", "#f0c7a8"],
  hail: ["#dfe3e6", "#ccd2d6"],
  smoke: ["#e2ddd3", "#cdc6b8"],
};

/** Draws a small, real-crop-specific icon (stem + species-distinguishing
    detail) at (cx, baseY) -- cotton gets bolls, rice gets a paddy head on
    blades, wheat gets an awned spike, anything else (sugarcane etc.) a
    generic cane/leaf silhouette. `stress` (0-1) tints/droops the plant
    toward the hazard's own damage direction (browning for heat/fog/smoke,
    whitening for ice/hail) instead of a fixed static drawing, so the same
    icon reads as "under stress" as the animation progresses. */
function drawCrop(ctx: CanvasRenderingContext2D, crop: string, cx: number, baseY: number, scale: number, stress: number, kind: ExposureAnimKind) {
  const droop = stress * 6;
  const stemColor = kind === "ice" || kind === "hail" ? "#7fae7a" : `rgb(${74 + stress * 60}, ${143 - stress * 50}, ${60 - stress * 30})`;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.strokeStyle = stemColor;
  ctx.fillStyle = stemColor;
  ctx.lineWidth = 2.2 * scale;
  ctx.lineCap = "round";

  // stem
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(droop * 0.3, -20 * scale, droop, -38 * scale);
  ctx.stroke();

  if (crop === "cotton") {
    const bollColor = kind === "ice" ? "#eaf3f7" : `rgb(255,255,255)`;
    for (let i = 0; i < 3; i++) {
      const bx = droop * (0.4 + i * 0.3) + (i - 1) * 10 * scale;
      const by = -14 * scale - i * 9 * scale;
      ctx.beginPath();
      ctx.fillStyle = bollColor;
      ctx.globalAlpha = 0.95 - stress * 0.25;
      ctx.arc(bx, by, 5.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#b08b4f";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (crop === "rice") {
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.strokeStyle = stemColor;
      ctx.moveTo(0, -6 * scale);
      ctx.quadraticCurveTo(i * 5 * scale, -30 * scale, i * 7 * scale + droop, -46 * scale);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = `rgb(${201 - stress * 40}, ${168 + stress * 20}, ${90 - stress * 30})`;
    ctx.ellipse(droop, -44 * scale, 6 * scale, 3 * scale, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (crop === "wheat") {
    ctx.beginPath();
    ctx.fillStyle = `rgb(${212 - stress * 40}, ${176 + stress * 10}, ${84 - stress * 20})`;
    ctx.ellipse(droop, -42 * scale, 4.5 * scale, 11 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.strokeStyle = "#c9a24f";
      ctx.lineWidth = 1;
      ctx.moveTo(droop, -42 * scale + i * 3 * scale);
      ctx.lineTo(droop + (i < 0 ? -10 : 10) * scale, -50 * scale + i * 3 * scale);
      ctx.stroke();
    }
  } else {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.strokeStyle = stemColor;
      ctx.moveTo(0, -10 * scale);
      ctx.quadraticCurveTo(i * 10 * scale, -28 * scale, i * 14 * scale + droop, -40 * scale);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export default function ExposureCanvas({
  kind,
  crop,
  width = 260,
  height = 130,
}: {
  kind: ExposureAnimKind;
  crop: string;
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

    const sky = SKY[kind];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const cx = width * 0.5;
    const baseY = height - 14;

    const count = { fog: 8, ice: 22, flood: 0, heat: 6, hail: 34, smoke: 20 }[kind];
    const particles: Particle[] = Array.from({ length: count }, () => spawn());

    function spawn(): Particle {
      switch (kind) {
        case "fog":
          return { x: rand(0, width), y: rand(0, height * 0.7), vx: rand(0.05, 0.25), vy: 0, size: rand(30, 60), life: 0, maxLife: rand(300, 500) };
        case "ice":
          return { x: rand(0, width), y: rand(-height, 0), vx: rand(-0.15, 0.15), vy: rand(0.3, 0.7), size: rand(2, 4), life: 0, maxLife: rand(200, 400), extra: rand(0, Math.PI * 2) };
        case "heat":
          return { x: rand(0, width), y: height + rand(0, 20), vx: 0, vy: rand(-0.35, -0.15), size: rand(24, 50), life: 0, maxLife: rand(80, 160), extra: rand(0, Math.PI * 2) };
        case "hail":
          return { x: rand(0, width), y: rand(-height, 0), vx: rand(-0.4, 0.4), vy: rand(2.2, 3.6), size: rand(2, 3.5), life: 0, maxLife: 999 };
        case "smoke":
          return { x: rand(width * 0.3, width * 0.7), y: height + rand(0, 10), vx: rand(-0.3, 0.3), vy: rand(-0.5, -0.25), size: rand(6, 10), life: 0, maxLife: rand(90, 160) };
        default:
          return { x: 0, y: 0, vx: 0, vy: 0, size: 0, life: 0, maxLife: 1 };
      }
    }

    let raf = 0;
    let t = 0;
    let waterLevel = height; // for "flood": animated rising level

    function frame() {
      t += 1;
      ctx!.clearRect(0, 0, width, height);
      const grad = ctx!.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, sky[0]);
      grad.addColorStop(1, sky[1]);
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, width, height);

      // ground
      ctx!.fillStyle = "rgba(90,74,46,0.25)";
      ctx!.fillRect(0, height - 14, width, 14);

      const stress = Math.min(1, 0.3 + Math.sin(t * 0.02) * 0.15 + 0.35);

      if (kind === "flood") {
        const target = height * 0.42;
        waterLevel += (target - waterLevel) * 0.01;
        drawCrop(ctx!, crop, cx, baseY, 1, 0.5, kind);
        // water overlay on top of the crop, rising from the bottom
        ctx!.save();
        ctx!.beginPath();
        ctx!.rect(0, waterLevel, width, height - waterLevel);
        ctx!.clip();
        ctx!.fillStyle = "rgba(74,122,148,0.55)";
        ctx!.fillRect(0, waterLevel, width, height - waterLevel);
        ctx!.strokeStyle = "rgba(255,255,255,0.5)";
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        for (let x = 0; x <= width; x += 6) {
          const y = waterLevel + Math.sin(x * 0.12 + t * 0.06) * 2.5;
          x === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
        }
        ctx!.stroke();
        ctx!.restore();
      } else {
        drawCrop(ctx!, crop, cx, baseY, 1, stress, kind);
      }

      for (const p of particles) {
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;

        if (kind === "fog") {
          if (p.life > p.maxLife) Object.assign(p, spawn(), { life: 0 });
          if (p.x > width) p.x = -p.size;
          ctx!.filter = "blur(9px)";
          ctx!.globalAlpha = 0.3;
          ctx!.fillStyle = "#b8b2a0";
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.filter = "none";
        } else if (kind === "ice") {
          p.extra = (p.extra ?? 0) + 0.02;
          if (p.y > height || p.life > p.maxLife) Object.assign(p, spawn(), { y: -5 });
          ctx!.save();
          ctx!.translate(p.x, p.y);
          ctx!.rotate(p.extra);
          ctx!.strokeStyle = "#8fb6c9";
          ctx!.globalAlpha = 0.75;
          ctx!.lineWidth = 1;
          for (let a = 0; a < 4; a++) {
            ctx!.beginPath();
            ctx!.moveTo(-p.size, 0);
            ctx!.lineTo(p.size, 0);
            ctx!.rotate(Math.PI / 4);
          }
          ctx!.stroke();
          ctx!.restore();
        } else if (kind === "heat") {
          if (p.y < -20 || p.life > p.maxLife) Object.assign(p, spawn(), { y: height + 10 });
          const wobble = Math.sin(t * 0.05 + (p.extra ?? 0)) * 6;
          ctx!.globalAlpha = 0.12;
          ctx!.fillStyle = "#c9622f";
          ctx!.beginPath();
          ctx!.ellipse(p.x + wobble, p.y, p.size, p.size * 0.35, 0, 0, Math.PI * 2);
          ctx!.fill();
        } else if (kind === "hail") {
          if (p.y > height) Object.assign(p, spawn(), { y: -8 });
          ctx!.fillStyle = "#fff";
          ctx!.strokeStyle = "#5c6b74";
          ctx!.globalAlpha = 0.85;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.stroke();
        } else if (kind === "smoke") {
          if (p.life > p.maxLife) Object.assign(p, spawn(), { life: 0 });
          const frac = p.life / p.maxLife;
          ctx!.globalAlpha = 0.28 * (1 - frac);
          ctx!.fillStyle = "#726b5c";
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * (1 + frac), 0, Math.PI * 2);
          ctx!.fill();
        }
      }
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [kind, crop, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height }}
      className="block w-full rounded-lg border border-soft"
      aria-label={`${kind} on ${crop} animation`}
    />
  );
}
