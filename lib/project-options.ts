import { fieldWorkerProjects } from './field-workers';
import { prisma } from './prisma';

export async function getFieldWorkerProjectOptions() {
  const customProjects = await prisma.projectOption.findMany({
    orderBy: { name: 'asc' },
    select: { name: true },
  });

  return Array.from(new Set([...fieldWorkerProjects, ...customProjects.map((project) => project.name)]));
}

export async function isFieldWorkerProjectOption(value: string) {
  const projects = await getFieldWorkerProjectOptions();
  return projects.includes(value);
}

