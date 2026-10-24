"use client";

import { useEffect, useRef } from "react";
import type { LogEntry, LogLevel } from "@/lib/sim/types";

const LEVEL_STYLE: Record<LogLevel, string> = {
  info: "text-fg-muted",
  warn: "text-vuln",
  error: "text-breach",
  crit: "text-breach font-bold",
};

interface Props {
  logs: LogEntry[];
}

export function LogStream({ logs }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [logs.length]);

  return (
    <div className="flex min-h-0 flex-col bg-surface-3">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-5">
        {logs.map((l) => (
          <div key={l.seq} className="flex gap-2">
            <span className="shrink-0 text-fg-faint">#{String(l.seq).padStart(3, "0")}</span>
            <span className={`shrink-0 w-10 ${LEVEL_STYLE[l.level]}`}>{l.level.toUpperCase()}</span>
            <span className="shrink-0 text-contained">{l.source}</span>
            <span className={LEVEL_STYLE[l.level]}>{l.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
