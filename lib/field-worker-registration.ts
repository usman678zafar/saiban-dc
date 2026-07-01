export const FIELD_WORKER_REGISTRATION_CLOSED_MESSAGE =
  'Thank you for your interest in supporting Saiban. We are unable to accept new field worker registrations at the moment and sincerely appreciate your patience and understanding.';

export function isFieldWorkerRegistrationEnabled() {
  return process.env.FIELD_WORKER_REGISTRATION_ENABLED === 'true';
}
