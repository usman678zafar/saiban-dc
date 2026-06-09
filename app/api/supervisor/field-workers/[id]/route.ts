import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireSupervisorManager() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }

  if (session.user.role !== 'supervisor') {
    return { response: NextResponse.json({ message: 'Supervisor access required' }, { status: 403 }) };
  }

  const supervisor = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      project: true,
      canManageFieldWorkers: true,
      supervisorDepartments: {
        select: { project: true },
      },
    },
  });

  if (!supervisor?.canManageFieldWorkers) {
    return { response: NextResponse.json({ message: 'Field worker management access is not enabled for this supervisor.' }, { status: 403 }) };
  }

  const projects = supervisor.supervisorDepartments.length
    ? supervisor.supervisorDepartments.map((department) => department.project)
    : supervisor.project ? [supervisor.project] : [];

  if (projects.length === 0) {
    return { response: NextResponse.json({ message: 'No department is assigned to this supervisor.' }, { status: 403 }) };
  }

  return { supervisor, projects };
}

interface FieldWorkerRouteContext {
  params: {
    id: string;
  };
}

export async function PATCH(_request: NextRequest, _context: FieldWorkerRouteContext) {
  const auth = await requireSupervisorManager();
  if ('response' in auth) return auth.response;

  return NextResponse.json({ message: 'Supervisors cannot edit field workers. Please contact an admin.' }, { status: 403 });
}

export async function DELETE(_request: NextRequest, _context: FieldWorkerRouteContext) {
  const auth = await requireSupervisorManager();
  if ('response' in auth) return auth.response;

  return NextResponse.json({ message: 'Supervisors cannot delete field workers. Please contact an admin.' }, { status: 403 });
}
