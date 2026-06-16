'use client';

import Image from 'next/image';
import { useState } from 'react';
import LoginForm from './login-form';
import logo from '@/assests/logo.png';
import baitussalamLogo from '@/assests/baitussalam.webp';

type LoginRole = 'administration' | 'field_worker';
type LoginMode = 'volunteer' | 'administration';

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
    role: 'administration',
    label: 'Administration',
    title: 'Administration Login',
    redirect: '/signin',
  },
];

const modeOptions: Array<{ mode: LoginMode; label: string }> = [
  { mode: 'volunteer', label: 'Volunteer' },
  { mode: 'administration', label: 'Administration' },
];

export default function RoleLogin() {
  const [selectedMode, setSelectedMode] = useState<LoginMode>('volunteer');
  const [selectedRole, setSelectedRole] = useState<LoginRole>('field_worker');
  const selectedOption = loginOptions.find((option) => option.role === selectedRole) ?? loginOptions[0];

  const handleModeChange = (mode: LoginMode) => {
    setSelectedMode(mode);
    setSelectedRole(mode === 'volunteer' ? 'field_worker' : 'administration');
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-sm items-center px-2 sm:px-0">
      <div className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between gap-4">
          <Image src={logo} alt="Saiban" width={150} height={110} className="h-14 w-auto object-contain sm:h-16" priority />
          <Image src={baitussalamLogo} alt="Baitussalam" width={132} height={96} className="h-14 w-auto object-contain sm:h-16" priority />
        </div>
        <div className="mt-2 text-center">
          <h1 className="text-base font-semibold tracking-tight text-slate-950">Saiban Login</h1>
        </div>

        <div className="mt-2 grid h-9 grid-cols-2 gap-1 rounded-lg bg-slate-100 p-0.5">
          {modeOptions.map((option) => {
            const isSelected = option.mode === selectedMode;
            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => handleModeChange(option.mode)}
                className={`min-w-0 rounded-md px-3 text-center text-xs font-semibold transition ${
                  isSelected ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="block truncate">{option.label}</span>
              </button>
            );
          })}
        </div>

        <LoginForm
          key={`${selectedMode}-${selectedOption.role}`}
          title={selectedMode === 'volunteer' ? 'Volunteer Login' : selectedOption.title}
          defaultRedirect={selectedOption.redirect}
          loginRole={selectedOption.role}
          compact
        />

        <div className="mt-2 min-h-4 text-center text-xs leading-4">
          {selectedMode === 'volunteer' ? (
            <p className="text-slate-500">
              Want to volunteer?{' '}
              <a href="/signup" className="font-semibold text-blue-600 hover:underline">
                Register here
              </a>
            </p>
          ) : null}
        </div>
        <AuthFooter />
      </div>
    </div>
  );
}

function AuthFooter() {
  return (
    <footer className="mt-3 border-t border-slate-200 pt-2 text-center text-[10px] leading-4 text-slate-500">
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
