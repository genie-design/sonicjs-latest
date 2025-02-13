// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

import cloudflare from "@astrojs/cloudflare";

import tailwindcss from "@tailwindcss/vite";

import sentry from "@sentry/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    sentry({
      dsn: "https://00c82a9fe26c1f34d1e5a5b8747bc463@o4504414345166848.ingest.us.sentry.io/4508813188792320",
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      sourceMapsUploadOptions: {
        project: "sonicjs",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
    }),
  ],
  adapter: cloudflare(),

  vite: {
    plugins: [tailwindcss()],
  },
});
