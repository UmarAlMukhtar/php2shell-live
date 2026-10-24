"use client";

import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";
import type { TermLine } from "@/lib/sim/types";

const KIND_COLOR: Record<TermLine["kind"], string> = {
  in: "\x1b[1;37m",   // bright white — ingress/commands
  out: "\x1b[0;32m",  // green — normal output
  err: "\x1b[1;31m",  // bright red — faults
  sys: "\x1b[1;36m",  // cyan — system/simulation framing
  ok: "\x1b[1;32m",   // bright green — success
};
const RESET = "\x1b[0m";

interface Props {
  lines: TermLine[];
  className?: string;
}

/**
 * xterm.js surface fed by the shared sim-state term buffer. Diffs lines so
 * only new output is written. Runs purely client-side; the terminal never
 * executes anything — it renders scripted text.
 */
export function Terminal({ lines, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const writtenRef = useRef(0);
  const linesRef = useRef(lines);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    let disposed = false;
    let onResize: (() => void) | null = null;

    async function mount() {
      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (disposed || !hostRef.current) return;
      const term = new XTerm({
        convertEol: true,
        disableStdin: true,
        fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace",
        fontSize: 12,
        lineHeight: 1.25,
        theme: {
          background: "#1e2530",
          foreground: "#e6ebf2",
          cursor: "#1e2530",
          selectionBackground: "#26303e",
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(hostRef.current);
      fit.fit();
      termRef.current = term;

      onResize = () => fit.fit();
      window.addEventListener("resize", onResize);

      // Flush lines that arrived before the terminal mounted.
      for (const line of linesRef.current) {
        term.writeln(`${KIND_COLOR[line.kind]}${line.text}${RESET}`);
      }
      writtenRef.current = linesRef.current.length;
    }

    void mount();
    return () => {
      disposed = true;
      if (onResize) window.removeEventListener("resize", onResize);
      termRef.current?.dispose();
      termRef.current = null;
      writtenRef.current = 0;
    };
  }, []);

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    if (lines.length < writtenRef.current) {
      // Buffer was reset — clear and rewrite everything.
      term.reset();
      writtenRef.current = 0;
    }
    for (const line of lines.slice(writtenRef.current)) {
      term.writeln(`${KIND_COLOR[line.kind]}${line.text}${RESET}`);
    }
    writtenRef.current = lines.length;
  }, [lines]);

  return (
    <div
      ref={hostRef}
      className={`${className ?? ""} min-w-0 overflow-hidden bg-surface-3`}
      role="log"
      aria-label="Simulated terminal output"
      data-testid="terminal"
    />
  );
}
