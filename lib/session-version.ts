import { prisma } from './prisma';

let sessionVersionColumnAvailable: boolean | null = null;
let sessionVersionCheck: Promise<boolean> | null = null;

function isMissingSessionVersionColumnError(error: unknown) {
  return error instanceof Error && error.message.includes('User.sessionVersion') && error.message.includes('does not exist');
}

async function checkSessionVersionColumn() {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'User'
        AND column_name = 'sessionVersion'
    ) AS "exists"`,
  );

  return Boolean(rows[0]?.exists);
}

export async function hasSessionVersionColumn() {
  if (sessionVersionColumnAvailable !== null) return sessionVersionColumnAvailable;

  if (!sessionVersionCheck) {
    sessionVersionCheck = checkSessionVersionColumn()
      .then((exists) => {
        sessionVersionColumnAvailable = exists;
        return exists;
      })
      .catch((error) => {
        if (isMissingSessionVersionColumnError(error)) {
          sessionVersionColumnAvailable = false;
          return false;
        }

        throw error;
      })
      .finally(() => {
        sessionVersionCheck = null;
      });
  }

  return sessionVersionCheck;
}

export async function getSessionVersion(userId: string) {
  if (!(await hasSessionVersionColumn())) return 0;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true },
    });

    return user?.sessionVersion ?? 0;
  } catch (error) {
    if (isMissingSessionVersionColumnError(error)) {
      sessionVersionColumnAvailable = false;
      return 0;
    }

    throw error;
  }
}

export async function getSessionVersionUpdateData() {
  return (await hasSessionVersionColumn())
    ? { sessionVersion: { increment: 1 as const } }
    : {};
}
