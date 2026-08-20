"use client";

import { useEffect, useRef, useState } from "react";

export interface TickerStat {
  value: number;
  label: string;
  formatter?: (n: number) => string;
}

const COUNT_DURATION_MS = 1100;
const STAGGER_MS = 180;
const MARQUEE_SECONDS = 55; // slow, steady -- not a fast/distracting scroll

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export default function StatsTicker({ stats }: { stats: TickerStat[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const [displayed, setDisplayed] = useState<number[]>(() => stats.map(() => 0));
  const [countUpDone, setCountUpDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      // skip the count-up entirely -- final values shown immediately, no marquee
      setDisplayed(stats.map((s) => s.value));
      setCountUpDone(true);
      return;
    }

    const totalMs = COUNT_DURATION_MS + (stats.length - 1) * STAGGER_MS;

    function tick(now: number) {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;

      setDisplayed(
        stats.map((s, i) => {
          const delay = i * STAGGER_MS;
          const local = Math.min(Math.max(elapsed - delay, 0), COUNT_DURATION_MS);
          const progress = easeOutCubic(local / COUNT_DURATION_MS);
          return Math.round(s.value * progress);
        })
      );

      if (elapsed < totalMs) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayed(stats.map((s) => s.value));
        setCountUpDone(true);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const renderRow = (values: number[], ariaHidden: boolean) => (
    <div className="flex shrink-0 items-center gap-5 pr-5" aria-hidden={ariaHidden}>
      {values.map((v, i) => {
        const s = stats[i];
        const text = s.formatter ? s.formatter(v) : v.toLocaleString();
        return (
          <span key={i} className="flex items-center gap-5">
            {i > 0 && <span className="text-faint">&middot;</span>}
            <span className="tnum">{text}</span>
            <span className="text-faint">{s.label}</span>
          </span>
        );
      })}
    </div>
  );

  const runMarquee = countUpDone && !reducedMotion;

  return (
    <div
      className="overflow-hidden border-b border-soft px-4 py-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-6xl font-mono text-[11px]">
        {!runMarquee ? (
          renderRow(displayed, false)
        ) : (
          <div
            className="flex w-max"
            style={{
              animation: `marquee-scroll ${MARQUEE_SECONDS}s linear infinite`,
              animationPlayState: paused ? "paused" : "running",
            }}
          >
            {renderRow(displayed, false)}
            {renderRow(displayed, true)}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
