import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fieldWorkerProjects } from '@/lib/field-workers';
import { logSystemAudit } from '@/lib/system-audit';

const projectSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(80, 'Department name is too long'),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) return { response: NextResponse.json({ message: 'Admin access required' }, { status: 403 }) };
  return { session };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ('response' in auth) return auth.response;

  try {
    const input = projectSchema.parse(await request.json());
    if (fieldWorkerProjects.includes(input.name as (typeof fieldWorkerProjects)[number])) {
      return NextResponse.json({ message: 'A default department already uses this name.' }, { status: 409 });
    }

    const project = await prisma.projectOption.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ message: 'Department not found.' }, { status: 404 });
    }

    const updatedProject = await prisma.$transaction(async (tx) => {
      const updated = await tx.projectOption.update({
        where: { id: project.id },
        data: { name: input.name },
        select: { id: true, name: true, createdAt: true },
      });

      if (project.name !== input.name) {
        await tx.user.updateMany({
          where: { project: project.name },
          data: { project: input.name },
        });
        await tx.supervisorDepartment.updateMany({
          where: { project: project.name },
          data: { project: input.name },
        });
        await tx.orphanApplication.updateMany({
          where: { collectorProject: project.name },
          data: { collectorProject: input.name },
        });
      }

      return updated;
    });

    await logSystemAudit({
      action: 'department_updated',
      entityType: 'department',
      entityId: updatedProject.id,
      entityLabel: updatedProject.name,
      actorId: auth.session.user?.id,
      details: {
        from: project.name,
        to: updatedProject.name,
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? 'Invalid input' }, { status: 422 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ message: 'This department already exists.' }, { status: 409 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update department' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ('response' in auth) return auth.response;

  const project = await prisma.projectOption.findUnique({
    where: { id: params.id },
    select: { id: true, name: true },
  });

  if (!project) {
    return NextResponse.json({ message: 'Department not found.' }, { status: 404 });
  }

  const [users, supervisorDepartments, applications] = await Promise.all([
    prisma.user.count({ where: { project: project.name } }),
    prisma.supervisorDepartment.count({ where: { project: project.name } }),
    prisma.orphanApplication.count({ where: { collectorProject: project.name } }),
  ]);

  if (users > 0 || supervisorDepartments > 0 || applications > 0) {
    return NextResponse.json({ message: 'This department is already in use and cannot be deleted.' }, { status: 409 });
  }

  await prisma.projectOption.delete({ where: { id: project.id } });
  await logSystemAudit({
    action: 'department_deleted',
    entityType: 'department',
    entityId: project.id,
    entityLabel: project.name,
    actorId: auth.session.user?.id,
  });
  return NextResponse.json({ message: 'Department deleted successfully.' });
}




