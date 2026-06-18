export const formNoAutofillProps = {
  autoComplete: 'off',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other',
} as const;

export const fieldNoAutofillProps = {
  autoComplete: 'new-password',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other',
} as const;

export const passwordNoAutofillProps = {
  ...fieldNoAutofillProps,
  autoComplete: 'new-password',
} as const;

export function AutofillTrap() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0">
      <input tabIndex={-1} type="text" name="username" autoComplete="username" />
      <input tabIndex={-1} type="password" name="password" autoComplete="current-password" />
      <input tabIndex={-1} type="text" name="email" autoComplete="email" />
      <input tabIndex={-1} type="text" name="address" autoComplete="street-address" />
    </div>
  );
}
