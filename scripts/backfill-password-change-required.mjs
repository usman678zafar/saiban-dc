import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const result = await prisma.user.updateMany({
    where: {
      role: {
        in: [UserRole.reviewer, UserRole.supervisor],
      },
    },
    data: {
      passwordChangeRequired: true,
    },
  });

  console.log(`Marked ${result.count} reviewer/supervisor accounts for password change.`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
