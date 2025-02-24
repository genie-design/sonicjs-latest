// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

import cloudflare from "@astrojs/cloudflare";

import tailwindcss from "@tailwindcss/vite";

import sentry from "@sentry/astro";
import { loadEnv } from "vite";
// @ts-expect-error process is not defined
// eslint-disable-next-line no-undef
const env = loadEnv(process.env.NODE_ENV, process.cwd(), "");
// https://astro.build/config
export default defineConfig({
  integrations: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    sentry({
      sourceMapsUploadOptions: {
        project: "sonicjs",
        authToken: env.SENTRY_AUTH_TOKEN,
      },
    }),
  ],
  adapter: cloudflare({
    platformProxy: {
      persist: { path: "../../.wrangler/v3" },
    }
  }),

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  },
});
