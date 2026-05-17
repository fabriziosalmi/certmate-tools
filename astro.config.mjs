import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://tools.certmate.org",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "it", "de", "fr"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
