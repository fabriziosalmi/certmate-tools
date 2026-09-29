/**
 * Guide registry guard.
 *
 * Guides funnel to a CTA: either a live internal tool or a curated
 * external URL. A guide pointing at a missing tool slug (or at plain
 * http) would ship a dead or insecure call-to-action, so the registry
 * is pinned here. Copy must also stay em-dash free (house style).
 */
import { describe, expect, it } from "vitest";

import { guides } from "~/data/guides";
import { internalTools } from "~/data/tools";

const liveSlugs = new Set(
  internalTools.filter((t) => t.status === "live").map((t) => t.slug)
);

describe("guides registry", () => {
  it("has unique slugs", () => {
    const slugs = guides.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("points every CTA at a live tool or an https external URL", () => {
    for (const g of guides) {
      if (g.toolSlug !== undefined) {
        expect(liveSlugs.has(g.toolSlug), `${g.slug} toolSlug`).toBe(true);
        expect(g.externalTool, `${g.slug} externalTool`).toBeUndefined();
      } else if (g.externalTool !== undefined) {
        expect(g.externalTool.url.startsWith("https://"), `${g.slug} url`).toBe(
          true
        );
      }
      // else: dig-only guide with no CTA by design (e.g. CAA/TLSA).
    }
  });

  it("has complete bilingual copy with no em-dashes", () => {
    for (const g of guides) {
      for (const c of [g.en, g.it]) {
        expect(c.title.length).toBeGreaterThan(0);
        expect(c.description.length).toBeGreaterThan(0);
        expect(c.sections.length).toBeGreaterThanOrEqual(3);
        const all = [c.title, c.description, c.intro, c.toolCta]
          .concat(c.sections.flatMap((s) => [s.heading, ...s.body]))
          .join("\n");
        expect(all, `${g.slug} em-dash`).not.toContain("—");
      }
    }
  });
});
