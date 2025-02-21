import { defineMiddleware } from 'astro:middleware';
import pino, { multistream } from 'pino';
import { createWriteStream, Severity } from 'pino-sentry';

import { Auth } from '@/services/auth/auth';
import { initializeConfig } from '@/services/auth/config';
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.logger = setupLogger();
  context.locals.logger.trace('Logger initialized');

  const origin = context.request.headers.get('origin');
  if (context.request.method !== 'GET') {
    if (origin === null || !origin.includes('localhost')) {
      context.locals.logger.trace('Origin not allowed');
      return new Response(`Origin not allowed: ${origin}`, { status: 403 });
    }
  }

  const config = initializeConfig(
    context.locals.runtime.env.DB,
    context.locals.runtime.env,
  );
  context.locals.auth = new Auth(config);
  context.locals.logger.trace('Auth initialized');
  // const config = initializeConfig(
  //   context.locals.runtime.env.DB,
  //   context.locals.runtime.env,
  // );
  // context.locals.auth = new Auth(config);

  // // Get session token from cookie
  // const sessionId = context.cookies.get('session')?.value;

  // // Check if we're already on the login or register page
  // const isAuthPage = context.url.pathname.match(/^\/admin\/(login|register)/);

  // try {
  //   if (sessionId) {
  //     // Validate the session
  //     const { user } = await context.locals.auth.validateSession(sessionId);
  //     if (user) {
  //       context.locals.user = user;

  //       // If user is logged in and tries to access login/register, redirect to admin
  //       if (isAuthPage) {
  //         context.locals.logger.trace('Redirecting to admin');
  //         return context.redirect('/admin');
  //       }

  //       return next();
  //     }
  //   }

  //   // Don't redirect if already on auth pages
  //   if (isAuthPage) {
  //     context.locals.logger.trace('Already on auth pages');
  //     return next();
  //   }

  //   // If no valid session and trying to access protected routes, redirect to login
  //   if (context.url.pathname.startsWith('/admin')) {
  //     const usersCount = await context.locals.auth.config.db
  //       .select({ count: count() })
  //       .from(userSchema);

  //     if (usersCount[0].count === 0) {
  //       context.locals.logger.trace('Redirecting to register');
  //       return context.redirect('/admin/register');
  //     }
  //     context.locals.logger.trace('Redirecting to login');
  //     return context.redirect('/admin/login');
  //   }
  // } catch (error) {
  //   // Handle session validation errors (expired, invalid, etc)
  //   console.error('Session validation error:', error);

  //   // Clear invalid session cookie
  //   context.cookies.delete('session', { path: '/' });

  //   // Don't redirect if already on auth pages
  //   if (isAuthPage) {
  //     return next();
  //   }

  //   // Redirect to login for protected routes
  //   if (context.url.pathname.startsWith('/admin')) {
  //     context.locals.logger.trace('Redirecting to login');
  //     return context.redirect('/admin/login');
  //   }
  // }

  return next();
});

function setupLogger() {
  const env = import.meta.env;
  const streams = [];

  // Add console stream
  streams.push({
    level: env.DEV ? 'trace' : 'warn',
    stream: process.stdout,
  });

  // Add Sentry stream if DSN is configured
  if (env.PUBLIC_SENTRY_DSN) {
    const sentryStream = createWriteStream({
      dsn: env.PUBLIC_SENTRY_DSN,
      environment: env.NODE_ENV || 'production',
      serverName: 'sonicjs',
      debug: env.PUBLIC_SENTRY_DEBUG === 'true',
      sampleRate: 1.0,
      maxBreadcrumbs: 100,
      level: Severity.Warning,
      maxValueLength: 250,
      sentryExceptionLevels: [Severity.Warning, Severity.Error, Severity.Fatal],
    });
    streams.push({
      level: 'warn',
      stream: sentryStream,
    });
  }

  // Create logger with multiple streams
  return pino(
    {
      level: env.DEV ? 'trace' : 'warn',
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
    },
    multistream(streams),
  );
}
