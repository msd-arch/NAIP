"use client";

import { useEffect, useRef } from "react";
import { LAYER_GROUPS, LAYERS, LayerId } from "../../explore/layers";

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
        }`}
      >
        {group.label}
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
              }`}
            >
              {meta.label}
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

export default function ExploreNav({
  activeLayer,
  onSelect,
}: {
  activeLayer: LayerId;
  onSelect: (id: LayerId) => void;
}) {
  return (
    <header className="sticky top-0 z-[1000] -mx-4 border-b border-soft bg-app/95 px-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 py-2.5">
        <span className="font-display text-sm font-semibold tracking-tight text-main">NAIP</span>

        <nav className="hidden flex-1 flex-wrap items-center gap-0.5 sm:flex">
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
                  }`}
                >
                  {group.label}
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

        {/* mobile fallback: a native select covers every layer in one control */}
        <select
          className="ml-auto block flex-1 rounded-lg border border-app bg-elev px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide text-dim sm:hidden"
          value={activeLayer}
          onChange={(e) => onSelect(e.target.value as LayerId)}
        >
          {LAYER_GROUPS.map((group) =>
            group.standalone ? (
              <option key={group.label} value={group.layers[0]}>
                {group.label}
              </option>
            ) : (
              <optgroup key={group.label} label={group.label}>
                {group.layers.map((id) => (
                  <option key={id} value={id}>
                    {LAYERS[id].label}
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
