import { compare } from 'bcryptjs';
import bcrypt from 'bcryptjs';
import CredentialsProvider from 'next-auth/providers/credentials';
import { type NextAuthOptions } from 'next-auth';
import { prisma } from './prisma';

export type Role = 'admin' | 'supervisor' | 'field_worker' | 'viewer';

declare module 'next-auth' {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: Role;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: Role;
  }
}

async function ensureBootstrapAdmin(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword || email.toLowerCase() !== adminEmail.toLowerCase() || password !== adminPassword) {
    return null;
  }

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingUser) return existingUser;

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  return prisma.user.create({
    data: {
      name: process.env.ADMIN_NAME ?? 'Admin User',
      email: adminEmail,
      passwordHash,
      role: 'admin',
    },
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
        const loginRole = credentials.loginRole === 'admin' || credentials.loginRole === 'supervisor' || credentials.loginRole === 'field_worker' ? credentials.loginRole : undefined;
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
            })
          : await prisma.user.findUnique({
            where: { email },
          }) ?? await ensureBootstrapAdmin(email, credentials.password);

        if (!user) return null;
        if (loginRole && user.role !== loginRole) return null;

        const isBootstrapLogin = process.env.ADMIN_EMAIL?.trim().toLowerCase() === email && process.env.ADMIN_PASSWORD === credentials.password;
        const isValid = isBootstrapLogin || await compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        if (isBootstrapLogin && user.role !== 'admin') {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: 'admin' },
          });
        }

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub ?? '';
        session.user.role = token.role;
      }
      return session;
    },
  },
};

