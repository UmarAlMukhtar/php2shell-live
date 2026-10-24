import { describe, expect, it } from "vitest";
import { CVE, SERVER_PHP_VERSION, TARGET_PATCH_VERSION, isVulnerable } from "@/lib/sim/cve";

describe("CVE-2026-109619 model", () => {
  it("marks the fictional server version as vulnerable", () => {
    expect(isVulnerable(SERVER_PHP_VERSION)).toBe(true);
  });

  it("marks the target patch as fixed", () => {
    expect(isVulnerable(TARGET_PATCH_VERSION)).toBe(false);
  });

  it("matches the published fixed versions per release line", () => {
    expect(CVE.fixedVersions).toEqual({
      "8.2": "8.2.35",
      "8.3": "8.3.36",
      "8.4": "8.4.27",
      "8.5": "8.5.12",
    });
    expect(isVulnerable("8.2.34")).toBe(true);
    expect(isVulnerable("8.2.35")).toBe(false);
    expect(isVulnerable("8.4.26")).toBe(true);
    expect(isVulnerable("8.4.27")).toBe(false);
    expect(isVulnerable("8.5.11")).toBe(true);
    expect(isVulnerable("8.5.12")).toBe(false);
  });
});
