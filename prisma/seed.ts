import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: 'postgresql://danish:root@localhost:5432/hackathon?schema=public',
  }),
});

async function main() {
  console.log('🌱 Starting database seed...');

  console.log('🗑️  Resetting database...');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "UserProfile" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📊 Summary:');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
