import { PrismaClient, FieldType } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

interface UzumCategory {
  id: number;
  parent_id: number | null;
  title_uz: string;
  title_ru: string;
}

async function main() {
  console.log('Starting Uzum categories seed...');
  
  const csvPath = path.join(__dirname, '../../uzum_categories.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Categories file not found at ${csvPath}`);
  }

  const categories: UzumCategory[] = [];
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => {
        const id = parseInt(data.id);
        const parent_id = data.parent_id ? parseInt(data.parent_id) : null;
        if (!isNaN(id)) {
          categories.push({
            id,
            parent_id,
            title_uz: data.title_uz || data.title,
            title_ru: data.title_ru || data.title,
          });
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Loaded ${categories.length} categories from CSV.`);

  // Clean existing data
  console.log('Clearing existing ItemSpecValue, ItemSpec, Category...');
  await prisma.itemSpecValue.deleteMany();
  await prisma.itemSpec.deleteMany();
  await prisma.category.deleteMany();

  // Find all parent ids to determine which nodes are leaves
  const parentIds = new Set(categories.map(c => c.parent_id).filter(id => id !== null));

  // Determine root: Node 1 is "Barcha toifalar". We can skip it and make its children root,
  // or we can just insert everything as is, but setting parentId=null for nodes where parent_id=1
  // Let's set parent_id=null for children of 1, and skip 1 itself.
  
  const cleanCategories = categories.filter(c => c.id !== 1).map(c => ({
    id: c.id,
    name_uz: c.title_uz,
    name_ru: c.title_ru,
    name_en: c.title_uz,
    parentId: c.parent_id === 1 ? null : c.parent_id,
    isLeaf: !parentIds.has(c.id)
  }));

  // To insert safely with foreign keys, we need to sort by depth.
  // We can do this by iteratively finding nodes whose parents are already inserted.
  let remaining = [...cleanCategories];
  const insertedIds = new Set<number>();
  let level = 1;

  while (remaining.length > 0) {
    const toInsert = remaining.filter(c => c.parentId === null || insertedIds.has(c.parentId));
    
    if (toInsert.length === 0) {
      console.warn(`Circular dependency or missing parents for ${remaining.length} nodes. Skipping them.`);
      break;
    }

    console.log(`Inserting ${toInsert.length} Level ${level} categories...`);
    
    // Chunk the inserts to avoid parameter limits in Postgres
    const chunkSize = 2000;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      await prisma.category.createMany({
        data: toInsert.slice(i, i + chunkSize),
        skipDuplicates: true,
      });
    }

    toInsert.forEach(c => insertedIds.add(c.id));
    remaining = remaining.filter(c => !insertedIds.has(c.id));
    level++;
  }

  console.log('Adding dynamic ItemSpecs to Leaf Categories...');
  
  // Build parent map for fast traversal
  const parentMap = new Map<number, number | null>();
  for (const c of cleanCategories) {
    parentMap.set(c.id, c.parentId);
  }

  // Helper to find root category name
  const findRootName = (id: number): string | null => {
    let curr = id;
    let prev = id;
    while (curr) {
      prev = curr;
      const parent = parentMap.get(curr);
      if (!parent) break;
      curr = parent;
    }
    const rootCat = cleanCategories.find(c => c.id === prev);
    return rootCat ? rootCat.name_ru || rootCat.name_uz : null;
  };

  const leafCategoryIds = cleanCategories.filter(c => c.isLeaf).map(c => c.id);
  
  const specs: any[] = [];
  for (const catId of leafCategoryIds) {
    const rootName = findRootName(catId);
    
    // Books
    if (rootName === 'Книги' || rootName === 'Kitoblar') {
      specs.push({ categoryId: catId, name: 'Muallif', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Nashriyot', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Til', type: FieldType.ENUM, required: false, options: ['O\'zbek', 'Rus', 'Ingliz'] });
      specs.push({ categoryId: catId, name: 'Muqova turi', type: FieldType.ENUM, required: false, options: ['Qattiq', 'Yumshoq'] });
      specs.push({ categoryId: catId, name: 'Sahifalar soni', type: FieldType.NUMBER, required: false });
      specs.push({ categoryId: catId, name: 'Nashr yili', type: FieldType.NUMBER, required: false });
      specs.push({ categoryId: catId, name: 'ISBN', type: FieldType.TEXT, required: false });
    }
    // Stationery
    else if (rootName === 'Канцтовары' || rootName === 'Kanselyariya') {
      specs.push({ categoryId: catId, name: 'Rang', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Material', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'To\'plamdagi soni', type: FieldType.NUMBER, required: false });
    }
    // Clothing & Shoes
    else if (rootName === 'Одежда' || rootName === 'Обувь') {
      specs.push({ categoryId: catId, name: 'O\'lcham', type: FieldType.ENUM, required: false, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Boshqa'] });
      specs.push({ categoryId: catId, name: 'Rang', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Material', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Jins', type: FieldType.ENUM, required: false, options: ['Erkaklar', 'Ayollar', 'Uniseks', 'Bolalar'] });
      specs.push({ categoryId: catId, name: 'Brend', type: FieldType.TEXT, required: false });
    }
    // Electronics & Home Appliances
    else if (rootName === 'Электроника' || rootName === 'Бытовая техника') {
      specs.push({ categoryId: catId, name: 'Brend', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Kafolat muddati', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Rang', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Holati', type: FieldType.ENUM, required: false, options: ['Yangi', 'Foydalanilgan'] });
    }
    // Auto
    else if (rootName === 'Автотовары') {
      specs.push({ categoryId: catId, name: 'Brend', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Avtomobil markasi', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Model', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Yili', type: FieldType.NUMBER, required: false });
    }
    // Furniture
    else if (rootName === 'Мебель') {
      specs.push({ categoryId: catId, name: 'Material', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Rang', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'O\'lchamlari', type: FieldType.TEXT, required: false });
    }
    // Kids
    else if (rootName === 'Детские товары') {
      specs.push({ categoryId: catId, name: 'Yosh chegarasi', type: FieldType.ENUM, required: false, options: ['0-12 oy', '1-3 yosh', '3-6 yosh', '7-12 yosh', '12+ yosh'] });
      specs.push({ categoryId: catId, name: 'Brend', type: FieldType.TEXT, required: false });
    }
    // Default
    else {
      specs.push({ categoryId: catId, name: 'Rang', type: FieldType.TEXT, required: false });
      specs.push({ categoryId: catId, name: 'Brend', type: FieldType.TEXT, required: false });
    }
  }

  const chunkSpecs = 3000;
  for (let i = 0; i < specs.length; i += chunkSpecs) {
    await prisma.itemSpec.createMany({
      data: specs.slice(i, i + chunkSpecs),
      skipDuplicates: true,
    });
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
