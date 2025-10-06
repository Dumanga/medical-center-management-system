const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.admin.findMany();
  console.log(admins);
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
