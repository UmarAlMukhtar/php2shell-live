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
      className={`rounded-[10px] border border-border bg-surface-1 p-5 border-l-4 ${
        ok ? "border-l-ok" : "border-l-breach"
      }`}
      aria-labelledby="report-title"
      data-testid="incident-report"
    >
      <p className="text-[11px] font-semibold tracking-widest text-fg-faint uppercase">
        incident report — {CVE.id}
      </p>
      <h2
        id="report-title"
        className={`mt-1 text-2xl font-extrabold tracking-wide ${
          ok ? "text-ok" : "text-breach"
        }`}
      >
        {ok ? "PATCHED" : "STILL VULNERABLE"}
      </h2>
      <p className="mt-2 text-sm text-fg">{report.summary}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-[11px] font-semibold tracking-widest text-fg-muted uppercase">
            actions taken
          </h3>
          <ol className="space-y-1 text-sm leading-6 text-fg">
            {report.actionsTaken.length === 0 ? (
              <li className="text-fg-faint">— none —</li>
            ) : (
              report.actionsTaken.map((a, i) => (
                <li key={a} className="flex gap-2">
                  <span className="w-5 shrink-0 text-right font-mono text-[11px] leading-6 text-fg-faint">
                    {i + 1}.
                  </span>
                  <span>{ACTION_LABELS.get(a) ?? a}</span>
                </li>
              ))
            )}
            <li className="font-mono text-[11px] text-fg-faint">
              restarts: {report.restarts} · capacity: {report.capacity}%
            </li>
          </ol>
        </div>
        <div>
          <h3 className="mb-1 text-[11px] font-semibold tracking-widest text-fg-muted uppercase">
            security lessons
          </h3>
          <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-fg-muted">
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
            className="rounded-lg border border-vuln/60 bg-vuln/10 px-4 py-2 text-xs font-semibold text-vuln hover:bg-vuln/20 focus-visible:outline-2 focus-visible:outline-vuln"
          >
            ← back to defend
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRestart}
          className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-xs font-semibold text-fg hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          ↺ run the incident again
        </button>
      </div>
    </motion.section>
  );
}
