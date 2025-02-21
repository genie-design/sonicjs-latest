import type { APIRoute } from 'astro';
import type { Auth } from '@/services/auth/auth';
import type { Logger } from 'pino';

interface Locals {
  auth: Auth;
  logger: Logger;
}

export const prerender = false;

export const GET: APIRoute<Locals> = async ({ request, locals }) => {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401 },
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Get user from token and validate the session
      const user = await locals.auth.getUserFromToken(token, true);

      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
        });
      }

      return new Response(JSON.stringify({ user }), { status: 200 });
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
      });
    }
  } catch (error) {
    locals.logger.error(`Token verification error: ${error}`);
    return new Response(
      JSON.stringify({ error: 'An error occurred during token verification' }),
      { status: 500 },
    );
  }
};
