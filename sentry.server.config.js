import * as Sentry from "@sentry/astro";
Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  // Enable performance monitoring
  tracesSampleRate: 1.0,
  // Enable session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Set environment
  environment: import.meta.env.PROD ? "production" : "development",
  // Adjust this value in production
  debug: import.meta.env.PUBLIC_SENTRY_DEBUG === "true",
  integrations: [],
  beforeSend(event) {
    // Don't send events in development
    if (import.meta.env.DEV) {
      return null;
    }
    return event;
  },
  // Ignore common errors that might create noise
  ignoreErrors: [
    // Add any error messages you want to ignore
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],
});
