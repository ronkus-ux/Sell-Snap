import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { cache } from 'react';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyPassword } from '@/lib/password';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        try {
          const user = await db.user.findUnique({
            where: { email: email.toLowerCase() },
          });

          if (!user) return null;

          const passwordMatch = await verifyPassword(password, user.passwordHash);
          if (!passwordMatch) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            businessName: user.businessName,
            onboarded: user.onboarded,
          };
        } catch (error) {
          logger.error('auth.authorize.failed', { error });
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.businessName = (user as { businessName?: string }).businessName;
        token.onboarded = (user as { onboarded?: boolean }).onboarded;
      } else if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { onboarded: true, businessName: true },
        });
        if (dbUser) {
          token.onboarded = dbUser.onboarded;
          token.businessName = dbUser.businessName;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { businessName?: string }).businessName = token.businessName as string;
        (session.user as { onboarded?: boolean }).onboarded = token.onboarded as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth',
    error: '/auth',
  },
});

/**
 * Returns the current session for use in server components and server actions.
 * Returns null if unauthenticated.
 *
 * Wrapped in React `cache()` so a layout and its child pages share a single
 * session read (JWT verification) per request.
 */
export const getSession = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
});
