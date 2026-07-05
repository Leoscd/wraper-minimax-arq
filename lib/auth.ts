/**
 * Configuración de NextAuth v5.
 *
 * Provider: Google OAuth
 * Session: JWT (sin DB extra para sesiones)
 * Persistencia de proyectos: Vercel KV
 */

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  trustHost: true,
  logger: {
    // Vercel trunca los console.error multilínea de Auth.js y se pierde la
    // causa real (p.ej. la respuesta del token endpoint de Google). Este
    // logger la aplana a una sola línea para poder verla en `vercel logs`.
    error(error: Error) {
      const cause = (error as Error & { cause?: { err?: Error } }).cause;
      const causeMsg =
        cause?.err?.message ??
        (cause as { message?: string } | undefined)?.message ??
        JSON.stringify(cause ?? {}).slice(0, 400);
      console.error(
        `[auth-error] ${error.name}: ${error.message} | causa: ${causeMsg}`
      );
    },
    warn(code) {
      console.warn(`[auth-warn] ${code}`);
    },
    debug() {},
  },
});
