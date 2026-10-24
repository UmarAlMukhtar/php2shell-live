"use client";

import { motion } from "motion/react";
import { CVE } from "@/lib/sim/cve";
import { DEFENDER_ACTIONS } from "@/lib/sim/defense";
import type { VerifyReport } from "@/lib/sim/types";

const ACTION_LABELS = new Map(DEFENDER_ACTIONS.map((d) => [d.id, d.label]));

interface Props {
  report: VerifyReport;
  onRestart: () => void;
  onBackToDefend: () => void;
}

export function ReportCard({ report, onRestart, onBackToDefend }: Props) {
  const ok = report.outcome === "success";
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-lg border p-5 ${
        ok ? "border-accent/60 bg-accent/5" : "border-danger/60 bg-danger/5"
      }`}
      aria-labelledby="report-title"
      data-testid="incident-report"
    >
      <p className="font-mono text-[10px] tracking-widest text-muted uppercase">
        incident report — {CVE.id}
      </p>
      <h2
        id="report-title"
        className={`mt-1 font-mono text-2xl font-bold tracking-widest ${
          ok ? "text-accent" : "text-danger"
        }`}
      >
        {ok ? "PATCHED" : "STILL VULNERABLE"}
      </h2>
      <p className="mt-2 text-sm text-foreground/90">{report.summary}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 font-mono text-[10px] tracking-widest text-muted uppercase">
            actions taken
          </h3>
          <ul className="font-mono text-xs leading-6 text-foreground/80">
            {report.actionsTaken.length === 0 ? (
              <li className="text-muted">— none —</li>
            ) : (
              report.actionsTaken.map((a) => (
                <li key={a}>▸ {ACTION_LABELS.get(a) ?? a}</li>
              ))
            )}
            <li className="text-muted">
              restarts: {report.restarts} · capacity: {report.capacity}%
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-1 font-mono text-[10px] tracking-widest text-muted uppercase">
            security lessons
          </h3>
          <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-foreground/80">
            {report.lessons.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {!ok ? (
          <button
            type="button"
            onClick={onBackToDefend}
            className="rounded border border-warn/60 bg-warn/10 px-4 py-2 font-mono text-xs text-warn hover:bg-warn/20 focus-visible:outline-2 focus-visible:outline-warn"
          >
            ← back to defend
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRestart}
          className="rounded border border-border bg-panel-2 px-4 py-2 font-mono text-xs text-foreground/90 hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          ↺ run the incident again
        </button>
      </div>
    </motion.section>
  );
}
