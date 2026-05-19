import type { APIRoute } from "astro";
import { internalTools } from "~/data/tools";
import { LOCALES, DEFAULT_LOCALE, localizedPath } from "~/i18n";

const SITE = "https://tools.certmate.org";

const routes = ["/", ...internalTools.filter((t) => t.status === "live").map((t) => `/${t.slug}/`)];

function urlEntry(path: string): string {
  const loc = `${SITE}${localizedPath(DEFAULT_LOCALE, path)}`;
  const alternates = LOCALES.map(
    (l) =>
      `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${localizedPath(l, path)}"/>`
  );
  alternates.push(
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${localizedPath(DEFAULT_LOCALE, path)}"/>`
  );
  return `  <url>
    <loc>${loc}</loc>
${alternates.join("\n")}
  </url>`;
}

export const GET: APIRoute = () => {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${routes.map(urlEntry).join("\n")}
</urlset>
`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
