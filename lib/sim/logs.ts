import type { LogEntry, LogLevel } from "./types";

/** Fictional infrastructure identifiers — reserved/dummy values only. */
export const ATTACKER_IP = "198.51.100.77"; // RFC 5737 TEST-NET-2
export const WORKER_ID = "php-fpm-07";
export const HOSTNAME = "app-01.php2shell.sim";

export function log(
  level: LogLevel,
  source: string,
  text: string,
): Omit<LogEntry, "seq"> {
  return { level, source, text };
}

/** Ambient (deterministic) background noise for the log stream. */
export const AMBIENT_LOGS: Array<Omit<LogEntry, "seq">> = [
  log("info", "nginx", `GET /healthz 200 1ms from 203.0.113.10`),
  log("info", WORKER_ID, `request #112 finished in 41ms (8.2MB)`),
  log("info", "cron", `session gc: 0 expired sessions`),
  log("info", WORKER_ID, `request #113 finished in 37ms (7.9MB)`),
  log("warn", "nginx", `slow request /search?q=* 812ms`),
  log("info", WORKER_ID, `request #114 finished in 55ms (9.1MB)`),
];
