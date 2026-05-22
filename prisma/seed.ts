import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@saiban.local' },
    update: { name: 'Super Admin User', passwordHash, role: 'super_admin' },
    create: {
      name: 'Super Admin User',
      email: 'admin@saiban.local',
      passwordHash,
      role: 'super_admin',
    },
  });

  await prisma.user.upsert({
    where: { email: 'field@saiban.local' },
    update: { name: 'Field Worker', passwordHash, role: 'field_worker' },
    create: {
      name: 'Field Worker',
      email: 'field@saiban.local',
      passwordHash,
      role: 'field_worker',
    },
  });

  await prisma.user.upsert({
    where: { email: 'viewer@saiban.local' },
    update: { name: 'Viewer User', passwordHash, role: 'viewer' },
    create: {
      name: 'Viewer User',
      email: 'viewer@saiban.local',
      passwordHash,
      role: 'viewer',
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
