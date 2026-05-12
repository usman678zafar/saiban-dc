'use client';

import { useState } from 'react';
import LoginForm from './login-form';

type LoginRole = 'admin' | 'field_worker';

const loginOptions: Array<{
  role: LoginRole;
  label: string;
  description: string;
  title: string;
  redirect: string;
}> = [
  {
    role: 'admin',
    label: 'Admin',
    description: 'Manage users, exports, migration status, and application review.',
    title: 'Admin Login',
    redirect: '/admin',
  },
  {
    role: 'field_worker',
    label: 'Field Worker',
    description: 'Collect applications, upload documents, and update draft records.',
    title: 'Field Worker Login',
    redirect: '/dashboard',
  },
];

export default function RoleLogin() {
  const [selectedRole, setSelectedRole] = useState<LoginRole>('field_worker');
  const selectedOption = loginOptions.find((option) => option.role === selectedRole) ?? loginOptions[1];

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Saiban Access</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Choose Login Type</h1>
        <p className="mt-2 text-sm text-slate-600">Select the portal you need, then sign in with the account created for that role.</p>

        <div className="mt-8 grid gap-3">
          {loginOptions.map((option) => {
            const isSelected = option.role === selectedRole;
            return (
              <button
                key={option.role}
                type="button"
                onClick={() => setSelectedRole(option.role)}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-slate-900 ring-2 ring-blue-100'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-sm text-slate-600">{option.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <LoginForm
        key={selectedOption.role}
        title={selectedOption.title}
        description={selectedOption.description}
        defaultRedirect={selectedOption.redirect}
        loginRole={selectedOption.role}
      />
    </div>
  );
}
