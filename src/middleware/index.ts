import { defineMiddleware } from "astro:middleware";
import { initializeConfig } from "@/services/auth/config";
import { Auth } from "@/services/auth/auth";
import { count } from "drizzle-orm";
import { table as userSchema } from "@/db/schema/users";
import type { APIContext } from "astro";
import pino, { type LoggerOptions } from "pino";
export const onRequest = defineMiddleware(async (context, next) => {
  const config = initializeConfig(
    context.locals.runtime.env.DB,
    context.locals.runtime.env,
  );
  context.locals.auth = new Auth(config);

  // Get session token from cookie
  const sessionId = context.cookies.get("session")?.value;

  // Check if we're already on the login or register page
  const isAuthPage = context.url.pathname.match(/^\/admin\/(login|register)/);

  try {
    if (sessionId) {
      // Validate the session
      const { user } = await context.locals.auth.validateSession(sessionId);
      if (user) {
        context.locals.user = user;

        // If user is logged in and tries to access login/register, redirect to admin
        if (isAuthPage) {
          return context.redirect("/admin");
        }

        return next();
      }
    }

    // Don't redirect if already on auth pages
    if (isAuthPage) {
      return next();
    }

    // If no valid session and trying to access protected routes, redirect to login
    if (context.url.pathname.startsWith("/admin")) {
      const usersCount = await context.locals.auth.config.db
        .select({ count: count() })
        .from(userSchema);

      if (usersCount[0].count === 0) {
        return context.redirect("/admin/register");
      }
      return context.redirect("/admin/login");
    }
  } catch (error) {
    // Handle session validation errors (expired, invalid, etc)
    console.error("Session validation error:", error);

    // Clear invalid session cookie
    context.cookies.delete("session", { path: "/" });

    // Don't redirect if already on auth pages
    if (isAuthPage) {
      return next();
    }

    // Redirect to login for protected routes
    if (context.url.pathname.startsWith("/admin")) {
      return context.redirect("/admin/login");
    }
  }

  context.locals.logger = setupLogger(context);
  return next();
});

function setupLogger(context: APIContext) {
  const env = context.locals.runtime.env;
  const pinoConfig: LoggerOptions = {};
  if (env.SENTRY_DSN) {
    const sentryConfig = {
      dsn: env.SENTRY_DSN,
      tracesSampleRate: 1.0,
    };
    pinoConfig.transport = {
      target: "pino-sentry-transport",
      options: {
        sentry: sentryConfig,
        withLogRecord: false, // default false - send the entire log record to sentry as a context.(FYI if its more then 8Kb Sentry will throw an error)
        tags: ["level"], // sentry tags to add to the event, uses lodash.get to get the value from the log record
        context: ["hostname"], // sentry context to add to the event, uses lodash.get to get the value from the log record,
        minLevel: 40, // which level to send to sentry
        expectPinoConfig: false, // default false - pass true if pino configured with custom messageKey or errorKey see below
      },
    };
  }

  return pino(pinoConfig);
}
