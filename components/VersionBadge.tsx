"use client";

import { isVulnerable } from "@/lib/sim/cve";

interface Props {
  version: string;
  patchStaged: boolean;
  targetVersion: string;
}

export function VersionBadge({ version, patchStaged, targetVersion }: Props) {
  const vulnerable = isVulnerable(version);
  return (
    <div
      className="flex items-center gap-2 rounded border border-border bg-panel-2 px-3 py-1.5 font-mono text-xs"
      data-testid="version-badge"
    >
      <span className="text-muted">PHP</span>
      <span className={vulnerable ? "text-danger" : "text-accent"}>{version}</span>
      <span
        className={`rounded-sm px-1.5 py-0.5 text-[9px] tracking-wider uppercase ${
          vulnerable ? "bg-danger/15 text-danger" : "bg-accent/15 text-accent"
        }`}
      >
        {vulnerable ? "vulnerable" : "patched"}
      </span>
      {patchStaged ? (
        <span className="rounded-sm bg-warn/15 px-1.5 py-0.5 text-[9px] tracking-wider text-warn uppercase">
          {targetVersion} staged
        </span>
      ) : null}
    </div>
  );
}
