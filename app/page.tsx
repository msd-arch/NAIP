import Link from "next/link";

const CARDS = [
  {
    href: "/hazards",
    title: "National Hazards",
    body: "126-district hazard alert feed from the real 11-detector engine (hazards.py, Week 1).",
  },
  {
    href: "/water-stress",
    title: "Water Stress",
    body: "Real head-to-tail stress gradient along the Muridke Distributary, elevation-verified (Week 2).",
  },
  {
    href: "/locust",
    title: "Locust Risk",
    body: "Real SMAP + Sentinel-2 breeding-risk screen over 3 named regions, one a labeled proxy boundary (Week 3).",
  },
  {
    href: "/crop-classifier",
    title: "Crop / Irrigation",
    body: "Irrigated-vs-not classifier, honestly reported below the majority-class baseline (Week 2).",
  },
  {
    href: "/exposure-risk",
    title: "Exposure Risk",
    body: "Hazard x crop-calendar fusion, filtered through the Week 4 agronomic-plausibility mask.",
  },
  {
    href: "/trigger-engine",
    title: "Insurance Trigger Engine",
    body: "Real, audited trigger-contract events with basis risk stated on every record (Week 4).",
  },
  {
    href: "/demo-walkthrough",
    title: "Demo Walkthrough",
    body: "The real end-to-end scenario -- Layyah, 2026-07-06, fog x cotton flowering -- as it actually ran.",
  },
];

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">NAIP National Dashboard</h1>
      <p className="mt-2 max-w-3xl text-sm text-dim">
        A visualization layer over real, already-generated data from NAIP Weeks 1-4 --
        national hazard detection, water accounting, crop intelligence, locust risk,
        the exposure-risk fusion model, and the insurance trigger-contract engine. No
        new modeling happens here; every view reads real JSON/CSV output already
        produced and reported in the project&apos;s status reports. This is a separate
        repo from the original MSG-SEVIRI 12-city pilot dashboard, which is untouched.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-soft bg-elev p-4 shadow-card transition-colors hover:border-accent/60"
          >
            <h2 className="text-sm font-semibold text-main">{c.title}</h2>
            <p className="mt-1.5 text-xs text-dim">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
