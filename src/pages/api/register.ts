import type { APIRoute } from 'astro';
import { count } from 'drizzle-orm';
import { table as userSchema } from '@/db/schema/users';
export const prerender = false;
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.formData();
    const firstName = data.get('firstName');
    const lastName = data.get('lastName');
    const email = data.get('email');
    const password = data.get('password');
    const confirmPassword = data.get('confirmPassword');

    // Basic validation
    if (!email || !password || !confirmPassword) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400 },
      );
    }

    if (!email.toString().includes('@')) {
      return new Response(
        JSON.stringify({
          error: 'Please enter a valid email address',
          field: 'email',
        }),
        { status: 400 },
      );
    }

    if (password.toString().length < 8) {
      return new Response(
        JSON.stringify({
          error: 'Password must be at least 8 characters long',
          field: 'password',
        }),
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return new Response(
        JSON.stringify({ error: 'Passwords do not match', field: 'password' }),
        { status: 400 },
      );
    }

    if (await locals.auth.getUserByEmail(email.toString())) {
      return new Response(
        JSON.stringify({
          error: 'Email is already registered',
          field: 'email',
        }),
        { status: 400 },
      );
    }

    const usersCount = await locals.auth.config.db
      .select({ count: count() })
      .from(userSchema);

    locals.logger.info('Users count:' + usersCount[0].count);

    // Create user
    await locals.auth.createUser({
      key: {
        password: password.toString(),
        provider: 'EMAIL',
        provider_user_id: email.toString(),
      },
      attributes: {
        firstName: firstName?.toString() || null,
        lastName: lastName?.toString() || null,
        email: email.toString(),
        role: usersCount[0].count === 0 ? 'admin' : 'user',
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  } catch (error) {
    locals.logger.error(`Registration error: ${error}`);
    return new Response(
      JSON.stringify({ error: 'An error occurred during registration' }),
      { status: 500 },
    );
  }
};
