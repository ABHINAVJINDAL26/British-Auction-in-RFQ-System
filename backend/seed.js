const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create Users
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@gocomet.com' },
    update: {},
    create: {
      name: 'John Buyer',
      email: 'buyer@gocomet.com',
      role: 'BUYER',
      company: 'GoComet Logistics'
    }
  });

  const supplier = await prisma.user.upsert({
    where: { email: 'supplier@carrier.com' },
    update: {},
    create: {
      name: 'Agent Carrier',
      email: 'supplier@carrier.com',
      role: 'SUPPLIER',
      company: 'FastShip Logistics'
    }
  });

  console.log({ buyer, supplier });

  // Create an initial RFQ
  const now = new Date();
  const bidStart = new Date(now.getTime() - 10 * 60000); // 10 mins ago
  const bidClose = new Date(now.getTime() + 15 * 60000); // 15 mins from now
  const forcedClose = new Date(now.getTime() + 60 * 60000); // 1 hour from now

  const rfq = await prisma.rFQ.create({
    data: {
      referenceId: `RFQ-${Date.now()}`,
      name: 'Consignment for Singapore to Chennai',
      buyerId: buyer.id,
      pickupDate: new Date(now.getTime() + 86400000 * 5),
      bidStartTime: bidStart,
      bidCloseTime: bidClose,
      forcedCloseTime: forcedClose,
      originalCloseTime: bidClose,
      status: 'ACTIVE',
      auctionConfig: {
        create: {
          triggerWindowX: 10,
          extensionDurationY: 5,
          triggerType: 'L1_RANK_CHANGE'
        }
      }
    }
  });

  console.log('Seed RFQ created:', rfq.referenceId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
