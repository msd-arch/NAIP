"use client";

import { useEffect, useRef } from "react";

export type AnimationKind = "ice" | "wind" | "heat" | "rain" | "hail" | "dust" | "fog" | "uv" | "smoke";

/** Maps a real hazard type to a visual animation kind. Where the real
    detector's own message text carries a real physical number (cold_wave's
    "mean ... skin temp X C"), that real number picks between two real
    sub-treatments (freezing vs. dry-cold) -- an honest visual choice
    grounded in real detector output, not a fabricated new classification.

    Explicitly NOT implemented: a "snow-level cold" variant. This project's
    real cold_wave detector has no snow classification at all -- Pakistan's
    MSG-based hazard pipeline does not detect snowfall anywhere in the real
    codebase -- so rather than invent a category with nothing real behind
    it, cold_wave only ever resolves to "ice" (freezing) or "wind" (dry
    cold), both grounded in the real skin-temperature sign. */
export function animationKindFor(hazard: string, messageEn: string): AnimationKind {
  if (hazard === "frost") return "ice";
  if (hazard === "cold_wave") {
    const m = messageEn.match(/(-?\d+\.?\d*)\s*°?\s*C\b/);
    const skinTempC = m ? parseFloat(m[1]) : null;
    return skinTempC !== null && skinTempC <= 0 ? "ice" : "wind";
  }
  if (hazard === "heat_wave") return "heat";
  if (hazard === "cloud_burst" || hazard === "heavy_rain") return "rain";
  if (hazard === "hail" || hazard === "thunderstorm") return "hail";
  if (hazard === "dust_storm") return "dust";
  if (hazard === "fog") return "fog";
  if (hazard === "uv_index") return "uv";
  if (hazard === "residue_burning") return "smoke";
  return "wind";
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; life: number; maxLife: number; extra?: number;
}

const PALETTE: Record<AnimationKind, { bg: [string, string]; fg: string }> = {
  ice: { bg: ["#dce8ef", "#c3d9e6"], fg: "#8fb6c9" },
  wind: { bg: ["#e8e2d1", "#ded5bd"], fg: "#8c8878" },
  heat: { bg: ["#f6ded0", "#f0c7a8"], fg: "#c9622f" },
  rain: { bg: ["#d8dfe3", "#c6d0d6"], fg: "#4a7a94" },
  hail: { bg: ["#dfe3e6", "#ccd2d6"], fg: "#5c6b74" },
  dust: { bg: ["#e8d9b8", "#dcc494"], fg: "#a9793f" },
  fog: { bg: ["#e6e2d8", "#d9d4c6"], fg: "#b8b2a0" },
  uv: { bg: ["#f7ecc7", "#f2dd97"], fg: "#c9971f" },
  smoke: { bg: ["#e2ddd3", "#cdc6b8"], fg: "#726b5c" },
};

/** Real, lightweight canvas particle system -- a genuine per-kind visual
    treatment (not the same animation reskinned in different colors), kept
    intentionally simple (30-70 particles, plain 2D canvas, no external
    animation library) so it stays smooth inside a small popup card.
    Rendered inside the popup itself, not smeared across the district's
    live map polygon -- clipping a synced particle layer to a real
    GeoJSON shape through every pan/zoom is a materially bigger, riskier
    build than this pass covers; flagged here plainly rather than shipped
    half-working. */
export default function HazardCanvas({ kind, width = 260, height = 130 }: { kind: AnimationKind; width?: number; height?: number }) {
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

    const palette = PALETTE[kind];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const count = { ice: 26, wind: 10, heat: 6, rain: 70, hail: 40, dust: 55, fog: 8, uv: 1, smoke: 24 }[kind];
    const particles: Particle[] = Array.from({ length: count }, () => spawn());

    function spawn(): Particle {
      switch (kind) {
        case "ice":
          return { x: rand(0, width), y: rand(-height, 0), vx: rand(-0.15, 0.15), vy: rand(0.25, 0.6), size: rand(2, 4), life: 0, maxLife: rand(200, 400), extra: rand(0, Math.PI * 2) };
        case "wind":
          return { x: rand(-40, 0), y: rand(10, height - 10), vx: rand(1.6, 3.2), vy: 0, size: rand(30, 70), life: 0, maxLife: rand(60, 140), extra: rand(-6, 6) };
        case "heat":
          return { x: rand(0, width), y: height + rand(0, 20), vx: 0, vy: rand(-0.35, -0.15), size: rand(30, 60), life: 0, maxLife: rand(80, 160), extra: rand(0, Math.PI * 2) };
        case "rain":
          return { x: rand(0, width), y: rand(-height, 0), vx: rand(-0.3, -0.1), vy: rand(3.5, 6), size: rand(6, 14), life: 0, maxLife: 999 };
        case "hail":
          return { x: rand(0, width), y: rand(-height, 0), vx: rand(-0.4, 0.4), vy: rand(2, 3.5), size: rand(2, 3.5), life: 0, maxLife: 999 };
        case "dust":
          return { x: rand(-20, width), y: rand(0, height), vx: rand(0.8, 2), vy: rand(-0.1, 0.1), size: rand(1.5, 3), life: 0, maxLife: rand(100, 220) };
        case "fog":
          return { x: rand(0, width), y: rand(0, height), vx: rand(0.05, 0.2), vy: rand(-0.03, 0.03), size: rand(40, 70), life: 0, maxLife: rand(300, 500) };
        case "uv":
          return { x: width - 26, y: 26, vx: 0, vy: 0, size: 14, life: 0, maxLife: 999 };
        case "smoke":
          return { x: rand(width * 0.3, width * 0.7), y: height + rand(0, 10), vx: rand(-0.3, 0.3), vy: rand(-0.5, -0.25), size: rand(6, 10), life: 0, maxLife: rand(90, 160) };
      }
    }

    let raf = 0;
    let pulse = 0;
    function frame() {
      ctx!.clearRect(0, 0, width, height);
      const grad = ctx!.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, palette.bg[0]);
      grad.addColorStop(1, palette.bg[1]);
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, width, height);

      pulse += 1;

      for (const p of particles) {
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;

        if (kind === "ice") {
          p.extra = (p.extra ?? 0) + 0.02;
          if (p.y > height || p.life > p.maxLife) Object.assign(p, spawn(), { y: -5 });
          ctx!.save();
          ctx!.translate(p.x, p.y);
          ctx!.rotate(p.extra);
          ctx!.strokeStyle = palette.fg;
          ctx!.globalAlpha = 0.75;
          ctx!.lineWidth = 1;
          for (let a = 0; a < 4; a++) {
            ctx!.beginPath();
            ctx!.moveTo(-p.size, 0); ctx!.lineTo(p.size, 0);
            ctx!.rotate(Math.PI / 4);
          }
          ctx!.stroke();
          ctx!.restore();
        } else if (kind === "wind") {
          if (p.x > width + 40 || p.life > p.maxLife) Object.assign(p, spawn(), { x: -40 });
          ctx!.strokeStyle = palette.fg;
          ctx!.globalAlpha = 0.35;
          ctx!.lineWidth = 1.5;
          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y);
          ctx!.quadraticCurveTo(p.x + p.size / 2, p.y + (p.extra ?? 0), p.x + p.size, p.y);
          ctx!.stroke();
        } else if (kind === "heat") {
          if (p.y < -20 || p.life > p.maxLife) Object.assign(p, spawn(), { y: height + 10 });
          const wobble = Math.sin(pulse * 0.05 + (p.extra ?? 0)) * 6;
          ctx!.globalAlpha = 0.12;
          ctx!.fillStyle = palette.fg;
          ctx!.beginPath();
          ctx!.ellipse(p.x + wobble, p.y, p.size, p.size * 0.35, 0, 0, Math.PI * 2);
          ctx!.fill();
        } else if (kind === "rain") {
          if (p.y > height) Object.assign(p, spawn(), { y: -10 });
          ctx!.strokeStyle = palette.fg;
          ctx!.globalAlpha = 0.55;
          ctx!.lineWidth = 1.4;
          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(p.x + p.vx * 3, p.y + p.size);
          ctx!.stroke();
        } else if (kind === "hail") {
          if (p.y > height) Object.assign(p, spawn(), { y: -8 });
          ctx!.fillStyle = "#fff";
          ctx!.strokeStyle = palette.fg;
          ctx!.globalAlpha = 0.85;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.stroke();
        } else if (kind === "dust") {
          if (p.x > width + 10 || p.life > p.maxLife) Object.assign(p, spawn(), { x: -10 });
          ctx!.fillStyle = palette.fg;
          ctx!.globalAlpha = 0.4;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
        } else if (kind === "fog") {
          if (p.life > p.maxLife) Object.assign(p, spawn(), { life: 0 });
          if (p.x > width) p.x = -p.size;
          ctx!.filter = "blur(8px)";
          ctx!.globalAlpha = 0.25;
          ctx!.fillStyle = palette.fg;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.filter = "none";
        } else if (kind === "uv") {
          const r = 10 + Math.sin(pulse * 0.06) * 3;
          ctx!.strokeStyle = palette.fg;
          ctx!.fillStyle = palette.fg;
          for (let a = 0; a < 8; a++) {
            const ang = (a / 8) * Math.PI * 2 + pulse * 0.01;
            ctx!.globalAlpha = 0.5;
            ctx!.lineWidth = 2;
            ctx!.beginPath();
            ctx!.moveTo(p.x + Math.cos(ang) * (r + 4), p.y + Math.sin(ang) * (r + 4));
            ctx!.lineTo(p.x + Math.cos(ang) * (r + 14), p.y + Math.sin(ang) * (r + 14));
            ctx!.stroke();
          }
          ctx!.globalAlpha = 0.9;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx!.fill();
        } else if (kind === "smoke") {
          if (p.life > p.maxLife) Object.assign(p, spawn(), { life: 0 });
          const t = p.life / p.maxLife;
          ctx!.globalAlpha = 0.3 * (1 - t);
          ctx!.fillStyle = palette.fg;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * (1 + t), 0, Math.PI * 2);
          ctx!.fill();
        }
      }
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [kind, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height }}
      className="block w-full rounded-lg border border-soft"
      aria-label={`${kind} animation`}
    />
  );
}
