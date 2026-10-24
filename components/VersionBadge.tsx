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
      className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 font-mono text-xs"
      data-testid="version-badge"
    >
      <span className="text-fg-muted">PHP</span>
      <span className={vulnerable ? "text-vuln" : "text-ok"}>{version}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
          vulnerable ? "bg-vuln/15 text-vuln" : "bg-ok/15 text-ok"
        }`}
      >
        {vulnerable ? "vulnerable" : "patched"}
      </span>
      {patchStaged ? (
        <span className="rounded-full bg-vuln/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-vuln uppercase">
          {targetVersion} staged
        </span>
      ) : null}
    </div>
  );
}
