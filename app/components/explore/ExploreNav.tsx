"use client";

import { useEffect, useRef, useState } from "react";
import { LAYER_GROUPS, LAYERS, LayerId } from "../../explore/layers";
import { useAppLocale } from "../../i18n/LocaleProvider";
import { useTranslations } from "next-intl";

/** Same <details>/<summary> click-to-toggle + click-outside-to-close pattern
    as the old site Nav.tsx's Dropdown, but each item calls onSelect(layerId)
    instead of routing to a new page -- this nav bar now carries the whole
    site's navigation, since the top-level Nav.tsx is gone. */
function NavDropdown({
  group,
  active,
  activeLayer,
  onSelect,
}: {
  group: (typeof LAYER_GROUPS)[number];
  active: boolean;
  activeLayer: LayerId;
  onSelect: (id: LayerId) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const { locale } = useAppLocale();

  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    const onDocClick = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className={`flex list-none cursor-pointer select-none items-center gap-1 whitespace-nowrap rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors [&::-webkit-details-marker]:hidden ${
          active ? "text-accent-500" : "text-faint hover:text-dim"
        } ${locale === "ur" ? "urdu-text normal-case" : ""}`}
      >
        {locale === "ur" ? group.labelUr : group.label}
        <svg width="8" height="8" viewBox="0 0 8 8" className="mt-px opacity-70">
          <path d="M1 2.5 4 5.5 7 2.5" stroke="currentColor" fill="none" strokeWidth="1.2" />
        </svg>
      </summary>
      <div className="absolute left-0 top-full z-[2000] mt-1 min-w-[230px] rounded-lg border border-app bg-elev py-1 shadow-card">
        {group.layers.map((id) => {
          const meta = LAYERS[id];
          const isActive = id === activeLayer;
          return (
            <button
              key={id}
              onClick={() => {
                onSelect(id);
                if (detailsRef.current) detailsRef.current.open = false;
              }}
              className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left font-mono text-[11px] uppercase tracking-wide ${
                isActive ? "bg-accent-soft text-accent-500" : "text-dim hover:bg-elev-2 hover:text-main"
              } ${locale === "ur" ? "urdu-text normal-case" : ""}`}
            >
              {locale === "ur" ? meta.labelUr : meta.label}
              {meta.mode !== "choropleth" && (
                <span className="text-[9px] normal-case tracking-normal text-faint">
                  {meta.mode === "panel-only" ? "panel" : "zoom"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </details>
  );
}

/** Top-right EN/UR toggle, matching the WRIP reference pattern. Switches
    which bilingual string every layer label/about/caveat renders -- see
    Track T (i18n). Page direction/layout never flips (see globals.css). */
function LanguageToggle() {
  const { locale, setLocale } = useAppLocale();
  const t = useTranslations("toggle");
  return (
    <div className="ml-2 flex shrink-0 items-center rounded-full border border-soft bg-elev p-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide">
      <button
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`rounded-full px-2 py-1 transition-colors ${
          locale === "en" ? "bg-accent-500 text-white" : "text-faint hover:text-dim"
        }`}
      >
        {t("en")}
      </button>
      <button
        onClick={() => setLocale("ur")}
        aria-pressed={locale === "ur"}
        className={`rounded-full px-2 py-1 transition-colors ${
          locale === "ur" ? "bg-accent-500 text-white" : "text-faint hover:text-dim"
        }`}
      >
        {t("ur")}
      </button>
    </div>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return "loading…";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min === 1) return "1 min ago";
  return `${min} min ago`;
}

export default function ExploreNav({
  activeLayer,
  onSelect,
  lastRefreshedUtc,
}: {
  activeLayer: LayerId;
  onSelect: (id: LayerId) => void;
  lastRefreshedUtc: string | null;
}) {
  const { locale } = useAppLocale();
  // Real "time ago" ticks smoothly regardless of how often actual refetches
  // land -- a cheap local re-render every 30s, not tied to the real 3-min
  // data-refresh interval in ExploreView.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <header className="sticky top-0 z-[1000] -mx-4 border-b border-soft bg-app/95 px-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 py-2.5">
        <span className="font-display text-sm font-semibold tracking-tight text-main">NAIP</span>

        <nav className="no-visible-scrollbar hidden flex-1 flex-nowrap items-center gap-0.5 overflow-x-auto sm:flex">
          {LAYER_GROUPS.map((group) => {
            if (group.standalone) {
              const id = group.layers[0];
              const active = id === activeLayer;
              return (
                <button
                  key={group.label}
                  onClick={() => onSelect(id)}
                  className={`whitespace-nowrap rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                    active ? "text-accent-500" : "text-faint hover:text-dim"
                  } ${locale === "ur" ? "urdu-text normal-case" : ""}`}
                >
                  {locale === "ur" ? group.labelUr : group.label}
                </button>
              );
            }
            return (
              <NavDropdown
                key={group.label}
                group={group}
                active={group.layers.includes(activeLayer)}
                activeLayer={activeLayer}
                onSelect={onSelect}
              />
            );
          })}
        </nav>

        <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[10px] text-faint md:flex" title="Real data auto-refreshes every 3 minutes, and immediately when you return to this tab.">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          data refreshed <span className="tnum text-dim">{timeAgo(lastRefreshedUtc)}</span>
        </span>
        <LanguageToggle />

        {/* mobile fallback: a native select covers every layer in one control */}
        <select
          className="block w-full basis-full rounded-lg border border-app bg-elev px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide text-dim sm:hidden"
          value={activeLayer}
          onChange={(e) => onSelect(e.target.value as LayerId)}
        >
          {LAYER_GROUPS.map((group) =>
            group.standalone ? (
              <option key={group.label} value={group.layers[0]}>
                {locale === "ur" ? group.labelUr : group.label}
              </option>
            ) : (
              <optgroup key={group.label} label={locale === "ur" ? group.labelUr : group.label}>
                {group.layers.map((id) => (
                  <option key={id} value={id}>
                    {locale === "ur" ? LAYERS[id].labelUr : LAYERS[id].label}
                  </option>
                ))}
              </optgroup>
            )
          )}
        </select>
      </div>
    </header>
  );
}
