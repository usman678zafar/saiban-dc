export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function normalizePakistanMobile(value: string) {
  const digits = digitsOnly(value).slice(0, 14);
  if (digits.startsWith('0092') && digits.length === 14) return `0${digits.slice(4)}`;
  if (digits.startsWith('92') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('3') && digits.length === 10) return `0${digits}`;
  return digits.slice(0, 11);
}

export function formatPakistanMobile(value: string) {
  return normalizePakistanMobile(value);
}

export function isValidPakistanMobile(value: string) {
  return /^03\d{9}$/.test(normalizePakistanMobile(value));
}

export function formatCnic(value: string) {
  const digits = digitsOnly(value).slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function cnicVariants(value: string) {
  const digits = digitsOnly(value);
  return digits ? [digits, formatCnic(digits)] : [];
}

export function isValidCnic(value: string) {
  return /^\d{5}-\d{7}-\d$/.test(formatCnic(value));
}
