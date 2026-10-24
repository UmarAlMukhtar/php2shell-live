import type { HeapBlock, HeapBlockState } from "@/lib/sim/types";

const ORDER: HeapBlockState[] = [
  "allocated",
  "freed",
  "reused",
  "stale",
  "corrupted",
  "free",
];

const COLOR: Record<HeapBlockState, string> = {
  allocated: "bg-accent",
  freed: "bg-muted-state",
  reused: "bg-vuln",
  stale: "bg-attack",
  corrupted: "bg-breach",
  free: "bg-border",
};

/** Compact heap-state strip — the bento "allocation bar" cell: one pip per
 *  block, colored by state (tailwind-only, no inline styles). */
export function HeapAllocStrip({ heap }: { heap: HeapBlock[] }) {
  const counts = ORDER.map((s) => ({
    state: s,
    n: heap.filter((b) => b.state === s).length,
  })).filter((c) => c.n > 0);
  return (
    <div aria-label="Heap allocation summary">
      <div className="flex flex-wrap gap-0.5">
        {counts.flatMap((c) =>
          Array.from({ length: c.n }, (_, i) => (
            <span
              key={`${c.state}-${i}`}
              className={`h-2 w-3 rounded-[2px] ${COLOR[c.state]}`}
            />
          )),
        )}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 font-mono text-[11px] text-fg-faint">
        {counts.map((c) => (
          <span key={c.state}>
            {c.state} {c.n}
          </span>
        ))}
      </p>
    </div>
  );
}
