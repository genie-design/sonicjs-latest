import type { APIRoute } from 'astro';
import type { Auth } from '@/services/auth/auth';
import type { Logger } from 'pino';

interface Locals {
  auth: Auth;
  logger: Logger;
}

export const prerender = false;

export const POST: APIRoute<Locals> = async ({ request, locals }) => {
  try {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');

    // Basic validation
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400 },
      );
    }

    try {
      // Get the user key and verify password
      const key = await locals.auth.useKey({
        provider: 'EMAIL',
        providerUserId: email.toString(),
        password: password.toString(),
      });

      // Get associated user
      const user = await locals.auth.getUser(key.user_id);

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Invalid email or password' }),
          { status: 401 },
        );
      }

      // Create JWT token
      const token = await locals.auth.createToken(user.id);

      return new Response(
        JSON.stringify({
          success: true,
          token,
        }),
        { status: 200 },
      );
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401 },
      );
    }
  } catch (error) {
    locals.logger.error(`Token generation error: ${error}`);
    return new Response(
      JSON.stringify({ error: 'An error occurred during token generation' }),
      { status: 500 },
    );
  }
};
