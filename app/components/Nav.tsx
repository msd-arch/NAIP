"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

interface NavLink {
  href: string;
  label: string;
}

interface NavItem {
  label: string;
  href?: string;
  items?: NavLink[];
}

const NAV: NavItem[] = [
  { label: "Overview", href: "/" },
  {
    label: "Hazard Monitoring",
    items: [
      { href: "/hazards", label: "National Hazards" },
      { href: "/locust", label: "Locust Risk" },
      { href: "/crop-stress", label: "Crop Stress Screen" },
    ],
  },
  {
    label: "Water & Climate",
    items: [
      { href: "/water-stress#canal-water-stress", label: "Canal Water Stress" },
      { href: "/water-stress#flood-risk", label: "Flood Risk Screen" },
      { href: "/water-stress#drought-signal", label: "National Drought Signal" },
    ],
  },
  {
    label: "Crop Intelligence",
    items: [
      { href: "/crop-classifier#irrigation-classifier", label: "Irrigation Classifier" },
      { href: "/crop-classifier#crop-model", label: "National Crop Model" },
      { href: "/crop-classifier#cross-year-validation", label: "Cross-Year Validation" },
      { href: "/crop-classifier#yield-prediction", label: "Yield Prediction" },
    ],
  },
  {
    label: "Insurance Engine",
    items: [
      { href: "/exposure-risk", label: "Exposure Risk" },
      { href: "/trigger-engine", label: "Trigger Engine" },
    ],
  },
  { label: "AI Models", href: "/models-in-production" },
];

/** One dropdown, built on <details>/<summary> so it's keyboard/tap-native with
    no hover-only trap on touch devices. A pointer-fine hover also opens/closes
    it on desktop via a small enter/leave handler, layered on top of the same
    <details> state rather than replacing it. */
function Dropdown({ item, active }: { item: NavItem; items: NavLink[]; active: boolean }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    const onDocClick = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const openOnHover = () => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (detailsRef.current) detailsRef.current.open = true;
  };
  const closeOnLeave = () => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    closeTimer.current = setTimeout(() => {
      if (detailsRef.current) detailsRef.current.open = false;
    }, 150);
  };

  return (
    <details
      ref={detailsRef}
      className="group relative"
      onMouseEnter={openOnHover}
      onMouseLeave={closeOnLeave}
    >
      <summary
        className={`flex list-none cursor-pointer select-none items-center gap-1 whitespace-nowrap rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors [&::-webkit-details-marker]:hidden ${
          active ? "text-accent-500" : "text-faint hover:text-dim"
        }`}
      >
        {item.label}
        <svg width="8" height="8" viewBox="0 0 8 8" className="mt-px opacity-70">
          <path d="M1 2.5 4 5.5 7 2.5" stroke="currentColor" fill="none" strokeWidth="1.2" />
        </svg>
      </summary>
      <div className="absolute left-0 top-full z-50 mt-1 min-w-[210px] rounded-lg border border-app bg-elev py-1 shadow-card">
        {item.items?.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => {
              if (detailsRef.current) detailsRef.current.open = false;
            }}
            className="block px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-dim hover:bg-elev-2 hover:text-main"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-soft bg-app/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="font-display text-sm font-semibold tracking-tight text-main">
          NAIP
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-0.5 overflow-x-auto">
          {NAV.map((item) => {
            if (item.href) {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                    active ? "text-accent-500" : "text-faint hover:text-dim"
                  }`}
                >
                  {item.label}
                </Link>
              );
            }
            const active = (item.items ?? []).some((l) => pathname === l.href.split("#")[0]);
            return <Dropdown key={item.label} item={item} items={item.items ?? []} active={active} />;
          })}
        </nav>
      </div>
    </header>
  );
}
