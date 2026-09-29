/**
 * Homepage label guard.
 *
 * Twice the homepage shipped cards titled with a raw slug
 * ("certificate-decoder", "nis2-tls-readiness") plus one slug with a digit
 * ("acme-dns-01": the old dash-letter regex dropped "-01"). Every live
 * internal tool must resolve to a real localized title and a non-empty
 * tagline in both locales.
 */
import { describe, expect, it } from "vitest";

import { internalTools } from "~/data/tools";
import { messages, toolLabels, type Locale } from "~/i18n";

const LOCALES: Locale[] = ["en", "it"];

describe("toolLabels", () => {
  for (const locale of LOCALES) {
    it(`resolves every live tool in ${locale}`, () => {
      const m = messages[locale];
      for (const t of internalTools.filter((x) => x.status === "live")) {
        const labels = toolLabels(m, t.slug, {
          title: t.title,
          tagline: t.tagline,
        });
        expect(labels.title, `${t.slug} title (${locale})`).not.toBe(t.slug);
        expect(labels.title.length, `${t.slug} title (${locale})`).toBeGreaterThan(0);
        expect(labels.tagline.length, `${t.slug} tagline (${locale})`).toBeGreaterThan(0);
      }
    });
  }

  it("handles slugs with digits (acme-dns-01)", () => {
    const labels = toolLabels(messages.en, "acme-dns-01");
    expect(labels.title).toBe("ACME DNS-01 Helper");
  });

  it("falls back to the registry, never the slug", () => {
    const labels = toolLabels(messages.en, "future-tool", {
      title: "Future Tool",
      tagline: "Coming soon.",
    });
    expect(labels.title).toBe("Future Tool");
    expect(labels.tagline).toBe("Coming soon.");
  });
});
