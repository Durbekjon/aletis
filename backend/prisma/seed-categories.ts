import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting categories seed from JSON...');
  
  await prisma.itemSpecValue.deleteMany({});
  await prisma.itemSpec.deleteMany({});
  await prisma.category.deleteMany({});
  console.log('Cleared existing categories.');

  const categoriesPath = path.join(__dirname, 'categories.json');
  const itemSpecsPath = path.join(__dirname, 'item_specs.json');

  if (!fs.existsSync(categoriesPath) || !fs.existsSync(itemSpecsPath)) {
    throw new Error('JSON data files not found in prisma directory.');
  }

  const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
  const itemSpecs = JSON.parse(fs.readFileSync(itemSpecsPath, 'utf8'));

  console.log(`Found ${categories.length} categories and ${itemSpecs.length} item specs. Executing insert...`);

  // We can't insert all categories at once if there are foreign key constraints on parentId 
  // Wait, if it's a self-relation, createMany might fail if the parent doesn't exist yet!
  // To avoid this, we can insert level by level, or disable foreign key checks temporarily.
  // Postgres allows temporarily deferring constraints if they are DEFERRABLE, but Prisma doesn't make this easy.
  // The easiest way is to insert them sequentially sorted by parentId (null first, then level 1, etc)
  
  // Actually, since we extracted them from a DB, sorting by ID might naturally sort by depth if they were created sequentially.
  // Let's sort by parentId (null first)
  const sortedCategories = [];
  const map = new Map();
  categories.forEach(c => map.set(c.id, c));
  
  const inserted = new Set();
  let remaining = categories;
  
  while(remaining.length > 0) {
    const batch = remaining.filter(c => c.parentId === null || inserted.has(c.parentId));
    if (batch.length === 0) {
       // fallback if there's a loop or broken reference
       console.warn('Broken references found, inserting remaining forcefully');
       await prisma.category.createMany({ data: remaining });
       break;
    }
    
    // Insert batch
    await prisma.category.createMany({ data: batch });
    batch.forEach(c => inserted.add(c.id));
    remaining = remaining.filter(c => !inserted.has(c.id));
  }
  
  console.log('Categories inserted.');

  // Insert ItemSpecs
  await prisma.itemSpec.createMany({ data: itemSpecs });
  console.log('ItemSpecs inserted.');

  // Update autoincrement sequences
  try {
    await prisma.$executeRaw`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));`;
    await prisma.$executeRaw`SELECT setval('item_specs_id_seq', (SELECT MAX(id) FROM item_specs));`;
    console.log('Updated sequences.');
  } catch (e) {
    console.log('Could not update sequences automatically, might not be postgres', e);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
