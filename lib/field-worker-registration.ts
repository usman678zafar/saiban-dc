export const FIELD_WORKER_REGISTRATION_CLOSED_MESSAGE =
  'Registrations have been temporarily paused. We are not accepting new applications at this time. Please check back later.';

export function isFieldWorkerRegistrationEnabled() {
  return process.env.FIELD_WORKER_REGISTRATION_ENABLED === 'true';
}
