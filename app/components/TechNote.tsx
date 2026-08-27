"use client";

import { useState } from "react";

/** Collapsible aside for internal engineering codenames (Track/Week/Phase
    labels) that shouldn't read as client-facing section titles or prose, but
    are worth keeping visible one click away for anyone auditing the work. */
export default function TechNote({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="font-mono text-[10px] uppercase tracking-wide text-faint underline underline-offset-2 hover:text-dim"
      >
        {open ? "hide technical detail" : "technical detail"}
      </button>
      {open && <p className="mt-1.5 text-[11px] text-faint">{children}</p>}
    </div>
  );
}
