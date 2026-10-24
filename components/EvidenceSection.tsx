"use client";

import { useId, useState, type ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  /** Render expanded on first mount. Default: collapsed. */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Collapsible evidence section — terminal/log wells that stay out of the
 * way until asked for. Children mount lazily on first open so measured
 * surfaces (xterm's FitAddon) never initialize at zero width.
 */
export function EvidenceSection({ title, children, defaultOpen = false, className }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();
  return (
    <section
      className={`flex min-h-0 flex-col rounded-[10px] border border-border bg-surface-1 ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={regionId}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold tracking-widest text-fg-muted uppercase transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span aria-hidden className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>
          ▸
        </span>
        {title}
      </button>
      {open ? (
        <div id={regionId} className="min-h-0 flex-1 border-t border-border">
          {children}
        </div>
      ) : null}
    </section>
  );
}
