import defineConfig from 'prisma/config';

const prismaConfig: any = defineConfig({
  schema: './schema.prisma',
  datasource: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL,
  },
  datasources: {
    db: {
      provider: 'postgresql',
      url: process.env.DATABASE_URL,
    },
  },
  connectionString: process.env.DATABASE_URL,
});

export default prismaConfig;
