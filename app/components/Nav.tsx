"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/hazards", label: "Hazards" },
  { href: "/water-stress", label: "Water Stress" },
  { href: "/locust", label: "Locust" },
  { href: "/crop-classifier", label: "Crop / Irrigation" },
  { href: "/exposure-risk", label: "Exposure Risk" },
  { href: "/trigger-engine", label: "Trigger Engine" },
  { href: "/models-in-production", label: "Models in Production" },
  { href: "/demo-walkthrough", label: "Demo" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-soft bg-app/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-2.5">
        <Link href="/" className="font-display text-sm font-semibold tracking-tight text-main">
          NAIP
        </Link>
        <nav className="flex flex-1 flex-wrap gap-0.5 overflow-x-auto">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                  active ? "text-accent-500" : "text-faint hover:text-dim"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
