import LoginForm from '@/components/login-form';

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 sm:px-8">
      <LoginForm
        title="Admin Login"
        description="Sign in with an admin account to manage applications, exports, and migration status."
        defaultRedirect="/admin"
        loginRole="admin"
      />
    </main>
  );
}
