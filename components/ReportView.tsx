"use client";

import { useSim } from "./SimProvider";
import { useForensics } from "./forensics/ForensicsProvider";
import { EvidenceSection } from "./EvidenceSection";
import { LogStream } from "./LogStream";
import { ReportCard } from "./ReportCard";
import { Terminal } from "./Terminal";

export function ReportView() {
  const { state, dispatch } = useSim();
  const fx = useForensics();

  if (!state.report) return null;

  return (
    <div className="flex flex-col gap-4">
      {fx && !fx.enabled ? (
        <button
          type="button"
          onClick={fx.toggle}
          className="w-fit rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-[11px] font-semibold tracking-widest text-accent uppercase hover:border-accent/60"
        >
          ◎ inspect the evidence — open forensics
        </button>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportCard
          report={state.report}
          onRestart={() => dispatch({ type: "RESET" })}
          onBackToDefend={() => dispatch({ type: "SET_PHASE", phase: "defend" })}
        />
        <div className="flex min-w-0 flex-col gap-4">
          <EvidenceSection title="Simulated terminal" className="min-h-[220px]">
            <Terminal lines={state.term} className="h-full min-h-[220px]" />
          </EvidenceSection>
          <EvidenceSection title="Security logs">
            <div className="max-h-64 overflow-hidden">
              <LogStream logs={state.logs} />
            </div>
          </EvidenceSection>
        </div>
      </div>
    </div>
  );
}
