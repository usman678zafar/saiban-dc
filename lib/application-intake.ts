export const NEW_APPLICATIONS_CLOSED_MESSAGE =
  'New applications are temporarily paused. Existing drafts can still be completed and submitted.';

export function isNewApplicationIntakeEnabled() {
  return process.env.NEW_APPLICATIONS_ENABLED === 'true';
}
