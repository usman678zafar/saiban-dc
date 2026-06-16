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
  phoneNumber: true,
  passwordChangeRequired: true,
  canCreateApplications: true,
  canManageFieldWorkers: true,
} satisfies Prisma.UserSelect;

declare module 'next-auth' {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: Role;
      sessionVersion?: number;
      passwordChangeRequired?: boolean;
      canCreateApplications?: boolean;
      canManageFieldWorkers?: boolean;
    };
  }

  interface User {
    role?: Role;
    sessionVersion?: number;
    passwordChangeRequired?: boolean;
    canCreateApplications?: boolean;
    canManageFieldWorkers?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: Role;
    sessionVersion?: number;
    passwordChangeRequired?: boolean;
    canCreateApplications?: boolean;
    canManageFieldWorkers?: boolean;
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
      passwordChangeRequired: false,
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
        const loginRole = credentials.loginRole === 'admin'
          || credentials.loginRole === 'reviewer'
          || credentials.loginRole === 'supervisor'
          || credentials.loginRole === 'field_worker'
          || credentials.loginRole === 'viewer'
          || credentials.loginRole === 'administration'
          ? credentials.loginRole
          : undefined;
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
          : loginRole === 'administration'
            ? await prisma.user.findFirst({
              where: {
                role: { in: ['supervisor', 'reviewer', 'viewer', 'admin', 'super_admin'] },
                OR: [
                  { phoneNumber: identifier },
                  { phoneNumber: numericIdentifier },
                  { email },
                ],
              },
              select: authUserSelect,
            }) ?? await ensureBootstrapAdmin(email, credentials.password)
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
          : loginRole === 'viewer'
            ? await prisma.user.findFirst({
              where: {
                role: 'viewer',
                email,
              },
              select: authUserSelect,
            })
          : await prisma.user.findUnique({
            where: { email },
            select: authUserSelect,
          }) ?? await ensureBootstrapAdmin(email, credentials.password);

        if (!user) return null;
        if (loginRole && loginRole !== 'administration' && (loginRole === 'admin' ? !['admin', 'super_admin'].includes(user.role) : user.role !== loginRole)) return null;
        let resolvedRole = user.role;
        let resolvedSessionVersion = await getSessionVersion(user.id);
        let resolvedPasswordChangeRequired = user.passwordChangeRequired;

        if (isBootstrapLogin) {
          const passwordMatchesHash = await compare(credentials.password, user.passwordHash);
          if (!passwordMatchesHash || user.role !== 'super_admin') {
            const updatedUser = await prisma.user.update({
              where: { id: user.id },
              data: {
                passwordHash: await bcrypt.hash(credentials.password, 10),
                role: 'super_admin',
                passwordChangeRequired: false,
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

          const defaultPhonePassword = user.phoneNumber ? digitsOnly(user.phoneNumber).slice(-4) : '';
          if (
            ['reviewer', 'supervisor'].includes(user.role) &&
            defaultPhonePassword &&
            credentials.password === defaultPhonePassword &&
            !user.passwordChangeRequired
          ) {
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordChangeRequired: true },
              select: { id: true },
            });
            resolvedPasswordChangeRequired = true;
          }
        }

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email,
          role: resolvedRole,
          sessionVersion: resolvedSessionVersion,
          passwordChangeRequired: resolvedPasswordChangeRequired,
          canCreateApplications: user.canCreateApplications,
          canManageFieldWorkers: user.canManageFieldWorkers,
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
        token.passwordChangeRequired = user.passwordChangeRequired ?? false;
        token.canCreateApplications = user.canCreateApplications ?? false;
        token.canManageFieldWorkers = user.canManageFieldWorkers ?? false;
        token.sessionInvalid = false;
        return token;
      }

      if (token.id) {
        const sessionVersionEnabled = await hasSessionVersionColumn();
        const currentSessionVersion = sessionVersionEnabled ? await getSessionVersion(token.id) : token.sessionVersion ?? 0;
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { passwordChangeRequired: true, canCreateApplications: true, canManageFieldWorkers: true },
        });

        if (sessionVersionEnabled && currentSessionVersion !== (token.sessionVersion ?? 0)) {
          token.sessionInvalid = true;
          delete token.id;
          delete token.role;
          delete token.passwordChangeRequired;
          delete token.canCreateApplications;
          delete token.canManageFieldWorkers;
        } else if (currentUser) {
          token.passwordChangeRequired = currentUser.passwordChangeRequired;
          token.canCreateApplications = currentUser.canCreateApplications;
          token.canManageFieldWorkers = currentUser.canManageFieldWorkers;
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
        session.user.passwordChangeRequired = token.passwordChangeRequired;
        session.user.canCreateApplications = token.canCreateApplications;
        session.user.canManageFieldWorkers = token.canManageFieldWorkers;
      }
      return session;
    },
  },
};

