"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/hazards", label: "National Hazards" },
  { href: "/water-stress", label: "Water Stress" },
  { href: "/locust", label: "Locust Risk" },
  { href: "/crop-classifier", label: "Crop / Irrigation" },
  { href: "/exposure-risk", label: "Exposure Risk" },
  { href: "/trigger-engine", label: "Insurance Trigger Engine" },
  { href: "/demo-walkthrough", label: "Demo Walkthrough" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-soft bg-app/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-3">
        <span className="mr-3 text-sm font-semibold text-main">NAIP</span>
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-accent text-[#05244a]"
                  : "text-dim hover:bg-elev-2 hover:text-main"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
