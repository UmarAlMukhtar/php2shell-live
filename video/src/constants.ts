export const C = {
  bg: "#0B0E13",
  surface: "#141A23",
  surface2: "#171C25",
  border: "#232B38",
  primary: "#E8EDF4",
  muted: "#8B99AC",
  accent: "#22D3EE",
  vuln: "#F59E0B",
  breach: "#EE5F55",
  ok: "#4ADE80",
};

// starts are cumulative — durations sum exactly to TOTAL_SEC (42)
export const SCENE = {
  hook: { start: 0, duration: 2.6 },
  reveal: { start: 2.6, duration: 5.4 },
  visualize: { start: 8, duration: 6 },
  forensics: { start: 14, duration: 5 },
  defend: { start: 19, duration: 6 },
  multiplayer: { start: 25, duration: 4 },
  climax: { start: 29, duration: 6.2 },
  close: { start: 35.2, duration: 6.8 },
} as const;

export const TOTAL_SEC = 42;
