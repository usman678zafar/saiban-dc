'use client';

import Image from 'next/image';
import { useState } from 'react';
import LoginForm from './login-form';
import logo from '@/assests/logo.png';
import baitussalamLogo from '@/assests/baitussalam.webp';

type LoginRole = 'admin' | 'supervisor' | 'field_worker';

const loginOptions: Array<{
  role: LoginRole;
  label: string;
  title: string;
  redirect: string;
}> = [
  {
    role: 'field_worker',
    label: 'Volunteer',
    title: 'Volunteer Login',
    redirect: '/applications',
  },
  {
    role: 'admin',
    label: 'Admin',
    title: 'Admin Login',
    redirect: '/admin',
  },
  {
    role: 'supervisor',
    label: 'Supervisor',
    title: 'Supervisor Login',
    redirect: '/supervisor',
  },
];

export default function RoleLogin() {
  const [selectedRole, setSelectedRole] = useState<LoginRole>('field_worker');
  const selectedOption = loginOptions.find((option) => option.role === selectedRole) ?? loginOptions[0];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-sm items-center px-2 sm:px-0">
      <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex min-h-20 items-center justify-between gap-6">
          <Image src={logo} alt="Saiban" width={150} height={110} className="h-16 w-auto object-contain sm:h-20" priority />
          <Image src={baitussalamLogo} alt="Baitussalam" width={132} height={96} className="h-16 w-auto object-contain sm:h-20" priority />
        </div>
        <div className="mt-3 text-center">
          <h1 className="text-lg font-semibold tracking-tight text-slate-950">Saiban Login</h1>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-0.5">
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

        {selectedRole === 'field_worker' ? (
          <p className="mt-3 text-center text-xs text-slate-500">
            Want to volunteer?{' '}
            <a href="/signup" className="font-semibold text-blue-600 hover:underline">
              Register here
            </a>
          </p>
        ) : null}
        <AuthFooter />
      </div>
    </div>
  );
}

function AuthFooter() {
  return (
    <footer className="mt-4 border-t border-slate-200 pt-3 text-center text-[11px] leading-5 text-slate-500">
      <a href="/privacy-policy" className="font-medium text-slate-600 hover:text-slate-900 hover:underline">
        Privacy Policy
      </a>
      <span className="mx-2 text-slate-300">|</span>
      <span>&copy; {new Date().getFullYear()} Saiban. All rights reserved.</span>
      <span className="mx-2 text-slate-300">|</span>
      <a href="tel:+923332552956" className="font-medium text-slate-600 hover:text-slate-900 hover:underline">
        +923332552956
      </a>
    </footer>
  );
}
