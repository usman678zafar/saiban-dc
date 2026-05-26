import { NextRequest } from 'next/server';
import { getClientIp } from './rate-limit';

type TurnstileResponse = {
  success: boolean;
  'error-codes'?: string[];
};

export function isCaptchaConfigured() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyCaptcha(request: NextRequest, token: unknown) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { success: true };
  if (typeof token !== 'string' || !token.trim()) {
    return { success: false, message: 'Complete the security check before submitting.' };
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  body.set('remoteip', getClientIp(request));

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const result = await response.json() as TurnstileResponse;

  return result.success
    ? { success: true }
    : { success: false, message: 'Security check failed. Please try again.' };
}
