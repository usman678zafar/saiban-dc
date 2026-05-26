import type { Prisma } from '@prisma/client';

export const fieldWorkerProjects = ['Link Road', 'Talagang', 'Makatib', 'Volunteer', 'Self Registered'] as const;

export type FieldWorkerProject = (typeof fieldWorkerProjects)[number];

export const reviewProjects = fieldWorkerProjects;

const projectAliases: Record<FieldWorkerProject, string[]> = {
  'Link Road': ['Link Road/\u0644\u0646\u06a9 \u0631\u0648\u0688'],
  Talagang: [],
  Makatib: ['Schools'],
  Volunteer: ['Volunteer/\u0631\u0636\u0627\u06a9\u0627\u0631'],
  'Self Registered': [],
};

export function isFieldWorkerProject(value: unknown): value is FieldWorkerProject {
  return typeof value === 'string' && fieldWorkerProjects.includes(value as FieldWorkerProject);
}

export function projectReviewValues(project: string) {
  if (!isFieldWorkerProject(project)) return [project];

  return [project, ...projectAliases[project]];
}

export function collectorProjectReviewWhere(project: string): Prisma.OrphanApplicationWhereInput {
  if (project === 'Self Registered') {
    return {
      OR: [
        { createdBy: { is: { selfRegistered: true } } },
        { collectorProject: { in: projectReviewValues(project) } },
        { collectorProject: '' },
        { collectorProject: null },
      ],
    };
  }

  return {
    collectorProject: {
      in: projectReviewValues(project),
    },
  };
}

export function projectMatchesReviewAssignment(
  applicationProject: string | null | undefined,
  reviewerProject: string | null | undefined,
  createdBySelfRegistered = false,
) {
  if (!reviewerProject) return false;

  if (reviewerProject === 'Self Registered' && createdBySelfRegistered) return true;
  if (reviewerProject === 'Self Registered' && !applicationProject) return true;
  if (!applicationProject) return false;

  return projectReviewValues(reviewerProject).includes(applicationProject);
}

