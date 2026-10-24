import { describe, expect, it } from "vitest";
import { APP_NAME, IS_SIMULATION_ONLY } from "@/lib/config";

describe("app config", () => {
  it("exposes the app name", () => {
    expect(APP_NAME).toBe("PHP2Shell: Live");
  });

  it("is flagged as simulation-only", () => {
    expect(IS_SIMULATION_ONLY).toBe(true);
  });
});
