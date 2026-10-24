/**
 * Verified facts about CVE-2026-109619 (GHSA-6wmf-4rv5-p3rp).
 *
 * Sources: PHP Foundation security announcement (2026-10-21), NVD record,
 * CVE.org record. Do not edit without re-verifying against the advisories.
 * Note: CVE-2026-109618 is a *separate* OOM-corruption RCE — do not conflate.
 */
export const CVE = {
  id: "CVE-2026-109619",
  ghsa: "GHSA-6wmf-4rv5-p3rp",
  title: "RCE via stale global state",
  published: "2026-10-21",
  cvss: "CVSS:4.0 9.2 CRITICAL (AV:N/AC:H/AT:P/PR:N/UI:N/VC:H/VI:H/VA:H)",
  cwes: ["CWE-416 Use After Free", "CWE-824 Access of Uninitialized Pointer", "CWE-755", "CWE-1325"],
  mechanism:
    "PHP global state temporarily points into per-request memory. " +
    "A fatal error at the wrong point can leave that global state pointing " +
    "at memory already freed back to the Zend allocator. A subsequent " +
    "request handled by the same worker may reuse that memory and read or " +
    "branch on the stale pointer — a use-after-free. Exploitation is high " +
    "complexity (AC:H): it needs request ordering on a shared worker and " +
    "heap grooming; it is not guaranteed RCE.",
  affectedSummary:
    "PHP < 8.2.35, 8.3.x < 8.3.36, 8.4.x < 8.4.27, 8.5.x < 8.5.12",
  fixedVersions: {
    "8.2": "8.2.35",
    "8.3": "8.3.36",
    "8.4": "8.4.27",
    "8.5": "8.5.12",
  } as const,
  references: [
    "https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/",
    "https://nvd.nist.gov/vuln/detail/cve-2026-109619",
    "https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp",
  ],
} as const;

/** Fictional host's runtime — vulnerable to CVE-2026-109619 (8.3.x < 8.3.36). */
export const SERVER_PHP_VERSION = "8.3.15";

/** Correct remediation for the simulated host's release line. */
export const TARGET_PATCH_VERSION = "8.3.36";

/** Returns true when `version` still contains the CVE-2026-109619 bug. */
export function isVulnerable(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return true;
  const minor = `${match[1]}.${match[2]}`;
  const fixed = (CVE.fixedVersions as Record<string, string>)[minor];
  if (!fixed) return true; // outside the 8.2–8.5 support lines: treat as affected
  const [, , , patch] = match;
  const fixedPatch = Number(fixed.split(".")[2]);
  return Number(patch) < fixedPatch;
}
