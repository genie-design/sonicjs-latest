import * as Sentry from "@sentry/astro";

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  // Enable performance monitoring
  tracesSampleRate: 1.0,
  // Enable session replay for better error understanding
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Set environment
  environment: import.meta.env.PROD ? "production" : "development",
  // Adjust this value in production
  debug: import.meta.env.PUBLIC_SENTRY_DEBUG === "true",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  beforeSend(event) {
    // Don't send events in development
    if (import.meta.env.DEV) {
      return null;
    }
    return event;
  },
  // Ignore common browser errors that might create noise
  ignoreErrors: [
    "top.GLOBALS",
    "ResizeObserver loop limit exceeded",
    // Add any other client-side errors you want to ignore
  ],
});
