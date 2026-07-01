export const FIELD_WORKER_REGISTRATION_CLOSED_MESSAGE =
  'New field worker registrations are paused for now. Thank you for understanding.';

export function isFieldWorkerRegistrationEnabled() {
  return process.env.FIELD_WORKER_REGISTRATION_ENABLED === 'true';
}
