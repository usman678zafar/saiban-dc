export const fieldWorkerProjects = ['Link Road', 'Talagang', 'Schools', 'Volunteer', 'Self Registered'] as const;

export type FieldWorkerProject = (typeof fieldWorkerProjects)[number];

export const reviewProjects = fieldWorkerProjects;

const projectAliases: Record<FieldWorkerProject, string[]> = {
  'Link Road': [],
  Talagang: [],
  Schools: [],
  Volunteer: ['Volunteer/رضاکار'],
  'Self Registered': [],
};

export function isFieldWorkerProject(value: unknown): value is FieldWorkerProject {
  return typeof value === 'string' && fieldWorkerProjects.includes(value as FieldWorkerProject);
}

export function projectReviewValues(project: string) {
  if (!isFieldWorkerProject(project)) return [project];

  return [project, ...projectAliases[project]];
}

export function collectorProjectReviewWhere(project: string) {
  if (project === 'Self Registered') {
    return {
      OR: [
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

export function projectMatchesReviewAssignment(applicationProject: string | null | undefined, reviewerProject: string | null | undefined) {
  if (!reviewerProject) return false;

  if (reviewerProject === 'Self Registered' && !applicationProject) return true;
  if (!applicationProject) return false;

  return projectReviewValues(reviewerProject).includes(applicationProject);
}
