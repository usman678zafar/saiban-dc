export const fieldWorkerProjects = ['Link Road', 'Talagang', 'Schools', 'Volunteer', 'Self Registered'] as const;

export type FieldWorkerProject = (typeof fieldWorkerProjects)[number];

export const reviewProjects = fieldWorkerProjects;

export function isFieldWorkerProject(value: unknown): value is FieldWorkerProject {
  return typeof value === 'string' && fieldWorkerProjects.includes(value as FieldWorkerProject);
}
