'use client';

import Image from 'next/image';
import { useState } from 'react';
import LoginForm from './login-form';
import logo from '@/assests/logo.png';

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
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
      <section className="space-y-8">
        <div className="flex items-center gap-5">
          <Image src={logo} alt="Saiban" width={170} height={132} className="h-24 w-auto object-contain" priority />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Data Collection Portal</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Saiban Orphan Support</h1>
          </div>
        </div>

        <div className="max-w-2xl">
          <p className="text-lg leading-8 text-slate-700">
            Secure access for field registration, application review, and migration management.
          </p>
        </div>

        <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
          {loginOptions.map((option) => {
            const isSelected = option.role === selectedRole;
            return (
              <button
                key={option.role}
                type="button"
                onClick={() => setSelectedRole(option.role)}
                className={`rounded-lg border px-5 py-4 text-left transition ${
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
