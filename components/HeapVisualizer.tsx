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
  ["free", "border-border bg-panel-2"],
  ["allocated", "border-info/60 bg-info/10"],
  ["freed", "border-muted/40"],
  ["reused", "border-warn/70 bg-warn/10"],
  ["stale", "border-danger/70 bg-danger/10"],
  ["corrupted", "border-danger bg-danger/25"],
];

/** Request-arena heap map — the "make the invisible visible" panel. */
export function HeapVisualizer({ heap, selectedId = null, onSelect }: Props) {
  return (
    <section aria-label="Heap memory map" className="rounded-lg border border-border bg-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-mono text-xs tracking-widest text-muted uppercase">
          Request arena — Zend heap
        </h2>
        <div className="flex flex-wrap gap-x-3 gap-y-1" aria-hidden>
          {LEGEND.map(([name, cls]) => (
            <span key={name} className="flex items-center gap-1 font-mono text-[9px] text-muted">
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
