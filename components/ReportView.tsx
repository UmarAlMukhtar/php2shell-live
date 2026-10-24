"use client";

import { useSim } from "./SimProvider";
import { useForensics } from "./forensics/ForensicsProvider";
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
          className="glass w-fit px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-cyan uppercase hover:bg-cyan/10"
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
        <div className="flex min-h-[300px] min-w-0 flex-col gap-4">
          <div className="glass min-h-[220px] flex-1 overflow-hidden">
            <Terminal lines={state.term} className="h-full" />
          </div>
          <div className="glass">
            <LogStream logs={state.logs} />
          </div>
        </div>
      </div>
    </div>
  );
}
