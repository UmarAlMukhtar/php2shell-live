"use client";

import { useSim } from "./SimProvider";
import { LogStream } from "./LogStream";
import { ReportCard } from "./ReportCard";
import { Terminal } from "./Terminal";

export function ReportView() {
  const { state, dispatch } = useSim();

  if (!state.report) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportCard
          report={state.report}
          onRestart={() => dispatch({ type: "RESET" })}
          onBackToDefend={() => dispatch({ type: "SET_PHASE", phase: "defend" })}
        />
        <div className="flex min-h-[300px] flex-col gap-4">
          <div className="min-h-[220px] flex-1 rounded-lg border border-border bg-panel">
            <Terminal lines={state.term} className="h-full" />
          </div>
          <LogStream logs={state.logs} />
        </div>
      </div>
    </div>
  );
}
