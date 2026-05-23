import { compare } from 'bcryptjs';
import bcrypt from 'bcryptjs';
import CredentialsProvider from 'next-auth/providers/credentials';
import { type NextAuthOptions } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getSessionVersion, getSessionVersionUpdateData, hasSessionVersionColumn } from './session-version';

export type Role = 'super_admin' | 'admin' | 'reviewer' | 'supervisor' | 'field_worker' | 'viewer';

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  passwordHash: true,
  role: true,
} satisfies Prisma.UserSelect;

declare module 'next-auth' {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: Role;
      sessionVersion?: number;
    };
  }

  interface User {
    role?: Role;
    sessionVersion?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: Role;
    sessionVersion?: number;
    sessionInvalid?: boolean;
  }
}

async function ensureBootstrapAdmin(email: string, password: string) {
  const adminEmail = (process.env.SUPER_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL)?.trim().toLowerCase();
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword || email.toLowerCase() !== adminEmail.toLowerCase() || password !== adminPassword) {
    return null;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: authUserSelect,
  });
  if (existingUser) return existingUser;

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  return prisma.user.create({
    data: {
      name: process.env.SUPER_ADMIN_NAME ?? process.env.ADMIN_NAME ?? 'Super Admin User',
      email: adminEmail,
      passwordHash,
      role: 'super_admin',
    },
    select: authUserSelect,
  });
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/signin',
  },
  providers: [
    CredentialsProvider({
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        loginRole: { label: 'Login Role', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const identifier = credentials.email.trim();
        const email = identifier.toLowerCase();
        const numericIdentifier = digitsOnly(identifier);
        const bootstrapEmail = (process.env.SUPER_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL)?.trim().toLowerCase();
        const bootstrapPassword = process.env.SUPER_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;
        const isBootstrapLogin = bootstrapEmail === email && bootstrapPassword === credentials.password;
        const loginRole = credentials.loginRole === 'admin' || credentials.loginRole === 'reviewer' || credentials.loginRole === 'supervisor' || credentials.loginRole === 'field_worker' ? credentials.loginRole : undefined;
        const user = loginRole === 'field_worker'
          ? await prisma.user.findFirst({
            where: {
              role: 'field_worker',
              OR: [
                { phoneNumber: numericIdentifier },
                { cnic: numericIdentifier },
                { email },
              ],
            },
            select: authUserSelect,
          })
          : loginRole === 'supervisor'
            ? await prisma.user.findFirst({
              where: {
                role: 'supervisor',
                OR: [
                  { phoneNumber: identifier },
                  { email },
                ],
              },
              select: authUserSelect,
            })
          : loginRole === 'reviewer'
            ? await prisma.user.findFirst({
              where: {
                role: 'reviewer',
                OR: [
                  { phoneNumber: identifier },
                  { email },
                ],
              },
              select: authUserSelect,
            })
          : await prisma.user.findUnique({
            where: { email },
            select: authUserSelect,
          }) ?? await ensureBootstrapAdmin(email, credentials.password);

        if (!user) return null;
        if (loginRole && (loginRole === 'admin' ? !['admin', 'super_admin'].includes(user.role) : user.role !== loginRole)) return null;
        let resolvedRole = user.role;
        let resolvedSessionVersion = await getSessionVersion(user.id);

        if (isBootstrapLogin) {
          const passwordMatchesHash = await compare(credentials.password, user.passwordHash);
          if (!passwordMatchesHash || user.role !== 'super_admin') {
            const updatedUser = await prisma.user.update({
              where: { id: user.id },
              data: {
                passwordHash: await bcrypt.hash(credentials.password, 10),
                role: 'super_admin',
                ...(await getSessionVersionUpdateData()),
              },
              select: {
                role: true,
              },
            });
            resolvedRole = updatedUser.role;
            resolvedSessionVersion = await getSessionVersion(user.id);
          } else {
            resolvedRole = 'super_admin';
          }
        } else {
          const isValid = await compare(credentials.password, user.passwordHash);
          if (!isValid) return null;
        }

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email,
          role: resolvedRole,
          sessionVersion: resolvedSessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.sessionInvalid = false;
        return token;
      }

      if (token.id) {
        const sessionVersionEnabled = await hasSessionVersionColumn();
        const currentSessionVersion = sessionVersionEnabled ? await getSessionVersion(token.id) : token.sessionVersion ?? 0;

        if (sessionVersionEnabled && currentSessionVersion !== (token.sessionVersion ?? 0)) {
          token.sessionInvalid = true;
          delete token.id;
          delete token.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.sessionInvalid) {
        delete session.user;
        return session;
      }

      if (session.user) {
        session.user.id = token.id ?? token.sub ?? '';
        session.user.role = token.role;
        session.user.sessionVersion = token.sessionVersion;
      }
      return session;
    },
  },
};

