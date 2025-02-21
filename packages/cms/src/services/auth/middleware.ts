import type { APIContext } from 'astro';

export const setUser = async (context: APIContext) => {
  if (!context.locals.user) {
    // Get session token from cookie
    const sessionId = context.cookies.get('auth_session')?.value;

    try {
      if (sessionId) {
        context.locals.logger.trace('Session ID:', sessionId);
        // Validate the session
        const { user } = await context.locals.auth.validateSession(sessionId);
        if (user) {
          context.locals.user = user;
        }
      } else {
        // Check Authorization header for JWT token
        const authHeader = context.request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            const user = await context.locals.auth.getUserFromToken(token);
            if (user) {
              context.locals.user = user;
            }
          } catch (error) {
            context.locals.logger.error('JWT verification error:', error);
          }
        }
      }
    } catch (error) {
      // Handle session validation errors (expired, invalid, etc)
      console.error('Session validation error:', error);

      // Clear invalid session cookie
      context.cookies.delete('session', { path: '/' });
    }
  }
  return { auth: context.locals.auth, user: context.locals.user };
};
