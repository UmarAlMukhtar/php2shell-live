"use client";

import { useEffect, useRef } from "react";
import type { LogEntry, LogLevel } from "@/lib/sim/types";

const LEVEL_STYLE: Record<LogLevel, string> = {
  info: "text-muted",
  warn: "text-warn",
  error: "text-danger",
  crit: "text-danger font-bold",
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
    <section aria-label="Security log stream" className="flex min-h-0 flex-col rounded-lg border border-border bg-panel">
      <h2 className="border-b border-border px-3 py-2 font-mono text-xs tracking-widest text-muted uppercase">
        Security logs
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-5">
        {logs.map((l) => (
          <div key={l.seq} className="flex gap-2">
            <span className="shrink-0 text-muted/60">#{String(l.seq).padStart(3, "0")}</span>
            <span className={`shrink-0 w-10 ${LEVEL_STYLE[l.level]}`}>{l.level.toUpperCase()}</span>
            <span className="shrink-0 text-info/80">{l.source}</span>
            <span className={LEVEL_STYLE[l.level]}>{l.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}
