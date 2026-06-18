import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: 'super_admin' | 'admin' | 'reviewer' | 'supervisor' | 'field_worker' | 'viewer';
      sessionVersion?: number;
      lastActiveAt?: number;
      passwordChangeRequired?: boolean;
      canCreateApplications?: boolean;
      canManageFieldWorkers?: boolean;
    };
  }
}
