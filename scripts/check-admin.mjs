import prisma from '../src/lib/prisma.js';

async function main() {
  const users = await prisma.admin.findMany();
  console.log(users);
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
