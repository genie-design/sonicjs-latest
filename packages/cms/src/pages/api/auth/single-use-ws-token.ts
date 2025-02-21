import type { APIRoute } from 'astro';
import type { Auth } from '@/services/auth/auth';
import type { Logger } from 'pino';
import { setUser } from '@/services/auth/middleware';
interface Locals {
  auth: Auth;
  logger: Logger;
}

export const prerender = false;

export const GET: APIRoute<Locals> = async (context) => {
  const locals = context.locals;
  try {
    await setUser(context);
    if (locals.user) {
      const token = await locals.auth.createTokenFromUser(
        locals.user,
        120,
        false,
        'SINGLE_WS',
      );

      // const verifyToken = await locals.auth.verifyToken(token);

      // console.log('bam', verifyToken);

      // if (verifyToken.payload) {
      //   const userByToken = await locals.auth.getKey('SINGLE_WS', token);
      //   console.log(
      //     'matchesKey',
      //     userByToken?.user_id === verifyToken.payload.userid,
      //   );
      // }

      return new Response(
        JSON.stringify({
          success: true,
          token,
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 401,
    });
  } catch (error) {
    locals.logger.error(`Error setting user: ${error}`);
    return new Response(
      JSON.stringify({ error: 'An error occurred during token generation' }),
      { status: 500 },
    );
  }
};
