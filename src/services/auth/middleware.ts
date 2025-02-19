import type { APIContext } from 'astro';
import { Auth } from './auth';
import { initializeConfig } from './config';
import { table as userSchema } from '@/db/schema/users';
import { count } from 'drizzle-orm';
export const setUser = async (context: APIContext) => {
  if (!context.locals.user) {
    // const users = await config.db.select({ count: count() }).from(userSchema);
    // context.locals.logger.debug('Users:', users);

    // Get session token from cookie
    const sessionId = context.cookies.get('auth_session')?.value;

    // Check if we're already on the login or register page
    //   const isAuthPage = context.url.pathname.match(/^\/admin\/(login|register)/);

    try {
      if (sessionId) {
        context.locals.logger.trace('Session ID:', sessionId);
        // Validate the session
        const { user } = await context.locals.auth.validateSession(sessionId);
        if (user) {
          context.locals.user = user;

          // If user is logged in and tries to access login/register, redirect to admin
          // if (isAuthPage) {
          //   context.locals.logger.trace('Redirecting to admin');
          //   return context.redirect('/admin');
          // }
        }
      }

      // Don't redirect if already on auth pages
      // if (isAuthPage) {
      //   context.locals.logger.trace('Already on auth pages');
      // }

      // If no valid session and trying to access protected routes, redirect to login
      // if (context.url.pathname.startsWith('/admin')) {
      //   const usersCount = await context.locals.auth.config.db
      //     .select({ count: count() })
      //     .from(userSchema);

      //   if (usersCount[0].count === 0) {
      //     context.locals.logger.trace('Redirecting to register');
      //     return context.redirect('/admin/register');
      //   }
      //   context.locals.logger.trace('Redirecting to login');
      //   return context.redirect('/admin/login');
      // }
    } catch (error) {
      // Handle session validation errors (expired, invalid, etc)
      console.error('Session validation error:', error);

      // Clear invalid session cookie
      context.cookies.delete('session', { path: '/' });

      // Don't redirect if already on auth pages
      // if (isAuthPage) {
      //   return next();
      // }

      // Redirect to login for protected routes
      // if (context.url.pathname.startsWith('/admin')) {
      //   context.locals.logger.trace('Redirecting to login');
      //   return context.redirect('/admin/login');
      // }
    }
  }
  return { auth: context.locals.auth, user: context.locals.user };
};
