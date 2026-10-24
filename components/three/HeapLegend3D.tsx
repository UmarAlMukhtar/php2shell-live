"use client";

import { STATE_COLOR } from "./HeapBlock3D";

const ENTRIES: Array<[string, string]> = [
  ["allocated", STATE_COLOR.allocated],
  ["freed", STATE_COLOR.freed],
  ["reused", STATE_COLOR.reused],
  ["stale ref", STATE_COLOR.stale],
  ["corrupted", STATE_COLOR.corrupted],
];

/** Color key overlay for the 3D arena. */
export function HeapLegend3D() {
  return (
    <div
      aria-hidden
      className="absolute top-3 left-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-fg-muted"
    >
      {ENTRIES.map(([name, color]) => (
        <span key={name} className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: color }}
          />
          {name}
        </span>
      ))}
    </div>
  );
}
