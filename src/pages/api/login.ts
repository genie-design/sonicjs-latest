import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');
    const remember = data.get('remember') === 'on';

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

      // Create session
      const session = await locals.auth.createSession({
        userId: user.id,
        attributes: {},
      });

      const cookieOptions = {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax' as const,
        maxAge: remember ? 60 * 60 * 24 * 14 : undefined, // 14 days if remember is checked
      };

      cookies.set('auth_session', session.session.id, cookieOptions);

      return new Response(
        JSON.stringify({
          success: true,
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
    locals.logger.error(`Login error: ${error}`);
    return new Response(
      JSON.stringify({ error: 'An error occurred during sign in' }),
      { status: 500 },
    );
  }
};
