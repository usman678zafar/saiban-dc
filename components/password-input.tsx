'use client';

import { InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  wrapperClassName?: string;
};

export default function PasswordInput({ className = '', wrapperClassName = '', disabled, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const label = isVisible ? 'Hide password' : 'Show password';
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <div className={`relative w-full ${wrapperClassName}`}>
      <input
        {...props}
        disabled={disabled}
        type={isVisible ? 'text' : 'password'}
        className={`w-full ${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setIsVisible((current) => !current)}
        disabled={disabled}
        aria-label={label}
        title={label}
        className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon size={17} aria-hidden="true" />
      </button>
    </div>
  );
}

export function PasswordValueReveal({
  value,
  fallback = '-',
  className = '',
}: {
  value: string;
  fallback?: string;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const label = isVisible ? 'Hide password' : 'Show password';
  const Icon = isVisible ? EyeOff : Eye;
  const hasValue = value.length > 0;

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span className={className}>{hasValue ? (isVisible ? value : '*'.repeat(value.length)) : fallback}</span>
      {hasValue ? (
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={label}
          title={label}
          className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <Icon size={16} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
