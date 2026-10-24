"use client";

import type { HeapBlock as HeapBlockT } from "@/lib/sim/types";
import { HeapBlock } from "./HeapBlock";

interface Props {
  heap: HeapBlockT[];
  /** FORENSICS mode: selected block + click-to-inspect. */
  selectedId?: number | null;
  onSelect?: (id: number | null) => void;
}

const LEGEND: Array<[string, string]> = [
  ["free", "border-border bg-surface-2"],
  ["allocated", "border-accent/60 bg-accent/10"],
  ["freed", "border-fg-faint/40"],
  ["reused", "border-vuln/70 bg-vuln/10"],
  ["stale", "border-attack/70 bg-attack/10"],
  ["corrupted", "border-breach bg-breach/25"],
];

/** Request-arena heap map — the "make the invisible visible" panel. */
export function HeapVisualizer({ heap, selectedId = null, onSelect }: Props) {
  return (
    <section aria-label="Heap memory map" className="rounded-[10px] border border-border bg-surface-1 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-widest text-fg-muted uppercase">
          Request arena — Zend heap
        </h2>
        <div className="flex flex-wrap gap-x-3 gap-y-1" aria-hidden>
          {LEGEND.map(([name, cls]) => (
            <span key={name} className="flex items-center gap-1 text-[11px] text-fg-muted">
              <span className={`inline-block h-2 w-2 rounded-sm border ${cls}`} />
              {name}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-6 xl:grid-cols-8">
        {heap.map((b) => (
          <HeapBlock
            key={b.id}
            id={b.id}
            state={b.state}
            tag={b.tag}
            showTag={b.state !== "free"}
            selected={selectedId === b.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
