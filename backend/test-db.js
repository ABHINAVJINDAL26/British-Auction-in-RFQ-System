const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const users = await prisma.user.findMany();
    console.log('Success:', users);
  } catch (e) {
    console.error('Failure:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
