import { PrismaClient, FieldType } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  { id: 1, parent_id: null, title_uz: 'Kanselyariya tovarlari', title_ru: 'Канцтовары', title_en: 'Stationery' },
  { id: 2, parent_id: 1, title_uz: 'Daftarlar', title_ru: 'Тетради', title_en: 'Notebooks' },
  { id: 3, parent_id: 1, title_uz: 'Ruchkalar', title_ru: 'Ручки', title_en: 'Pens' },
  { id: 4, parent_id: null, title_uz: 'Kitoblar', title_ru: 'Книги', title_en: 'Books' },
  { id: 5, parent_id: 4, title_uz: 'Badiiy adabiyot', title_ru: 'Художественная литература', title_en: 'Fiction' },
  { id: 6, parent_id: 4, title_uz: 'O\'quv qurollari', title_ru: 'Учебники', title_en: 'Textbooks' },
  { id: 7, parent_id: null, title_uz: 'Kiyimlar', title_ru: 'Одежда', title_en: 'Clothing' },
  { id: 8, parent_id: 7, title_uz: 'Erkaklar kiyimi', title_ru: 'Мужская одежда', title_en: 'Men\'s Clothing' },
  { id: 9, parent_id: 7, title_uz: 'Ayollar kiyimi', title_ru: 'Женская одежда', title_en: 'Women\'s Clothing' },
  { id: 10, parent_id: null, title_uz: 'Elektronika', title_ru: 'Электроника', title_en: 'Electronics' },
];

async function main() {
  console.log('Starting default categories seed...');
  
  await prisma.itemSpecValue.deleteMany({});
  await prisma.itemSpec.deleteMany({});
  await prisma.category.deleteMany({});
  console.log('Cleared existing categories.');

  for (const cat of defaultCategories) {
    await prisma.category.create({
      data: {
        id: cat.id,
        parentId: cat.parent_id,
        name_uz: cat.title_uz,
        name_ru: cat.title_ru,
        name_en: cat.title_en,
        isLeaf: !defaultCategories.some(c => c.parent_id === cat.id)
      }
    });
  }

  console.log('Categories inserted.');

  // Create ItemSpecs for specific root categories
  const booksCat = await prisma.category.findUnique({ where: { id: 4 } });
  if (booksCat) {
    // find leaf nodes
    const leaves = defaultCategories.filter(c => c.parent_id === 4);
    for (const leaf of leaves) {
      await prisma.itemSpec.createMany({
        data: [
          { categoryId: leaf.id, name: 'Author', type: FieldType.STRING, required: false },
          { categoryId: leaf.id, name: 'Publisher', type: FieldType.STRING, required: false },
          { categoryId: leaf.id, name: 'Pages', type: FieldType.NUMBER, required: false },
        ]
      });
    }
  }

  const stationeryCat = await prisma.category.findUnique({ where: { id: 1 } });
  if (stationeryCat) {
    const leaves = defaultCategories.filter(c => c.parent_id === 1);
    for (const leaf of leaves) {
      await prisma.itemSpec.createMany({
        data: [
          { categoryId: leaf.id, name: 'Brand', type: FieldType.STRING, required: false },
          { categoryId: leaf.id, name: 'Color', type: FieldType.STRING, required: false },
        ]
      });
    }
  }

  console.log('ItemSpecs created.');
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
