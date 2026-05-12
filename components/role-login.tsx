'use client';

import Image from 'next/image';
import { useState } from 'react';
import LoginForm from './login-form';
import logo from '@/assests/logo.png';

type LoginRole = 'admin' | 'field_worker';

const loginOptions: Array<{
  role: LoginRole;
  label: string;
  title: string;
  redirect: string;
}> = [
  {
    role: 'field_worker',
    label: 'Field Worker',
    title: 'Field Worker Login',
    redirect: '/applications',
  },
  {
    role: 'admin',
    label: 'Admin',
    title: 'Admin Login',
    redirect: '/admin',
  },
];

export default function RoleLogin() {
  const [selectedRole, setSelectedRole] = useState<LoginRole>('field_worker');
  const selectedOption = loginOptions.find((option) => option.role === selectedRole) ?? loginOptions[0];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-sm items-center px-2 sm:px-0">
      <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col items-center text-center">
          <Image src={logo} alt="Saiban" width={80} height={60} className="h-12 w-auto object-contain" priority />
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">Saiban Login</h1>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-0.5">
          {loginOptions.map((option) => {
            const isSelected = option.role === selectedRole;
            return (
              <button
                key={option.role}
                type="button"
                onClick={() => setSelectedRole(option.role)}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  isSelected ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <LoginForm
          key={selectedOption.role}
          title={selectedOption.title}
          defaultRedirect={selectedOption.redirect}
          loginRole={selectedOption.role}
          compact
        />
      </div>
    </div>
  );
}
