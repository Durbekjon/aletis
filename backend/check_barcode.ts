import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const barcode = '9789910701504';
  const itemSpecs = await prisma.itemSpecValue.findMany({
    where: {
      OR: [
        { valueText: { contains: barcode } },
        { valueJson: { path: ['$'], string_contains: barcode } }
      ]
    },
    include: { product: true }
  });
  console.log('Found product fields matching barcode:', JSON.stringify(itemSpecs, null, 2));

  // Let's also check if there are ANY products
  const count = await prisma.product.count();
  console.log('Total products in database:', count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
