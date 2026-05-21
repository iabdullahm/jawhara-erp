/**
 * Seed script — يملأ قاعدة البيانات ببيانات مبدئية للتطوير
 * تشغيل: pnpm --filter @jawhara/api seed
 */
import { PrismaClient, MetalType, Karat } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء البذر...');

  // ============ Branches ============
  const mainBranch = await prisma.branch.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      code: 'MAIN',
      name: 'Main Showroom',
      nameAr: 'الفرع الرئيسي',
      address: 'الموج، مسقط، سلطنة عُمان',
      phone: '+96812345678',
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { code: 'MOJ-02' },
    update: {},
    create: {
      code: 'MOJ-02',
      name: 'Mall Branch',
      nameAr: 'فرع المول',
      address: 'مول مسقط الكبير',
      phone: '+96812345679',
    },
  });

  // ============ Categories (Tree) ============
  const jewelry = await prisma.category.upsert({
    where: { slug: 'jewelry' },
    update: {},
    create: { name: 'Jewelry', nameAr: 'مجوهرات', slug: 'jewelry', sortOrder: 1 },
  });

  const categories = [
    { name: 'Rings', nameAr: 'خواتم', slug: 'rings' },
    { name: 'Necklaces', nameAr: 'قلائد', slug: 'necklaces' },
    { name: 'Bracelets', nameAr: 'أساور', slug: 'bracelets' },
    { name: 'Earrings', nameAr: 'أقراط', slug: 'earrings' },
    { name: 'Sets', nameAr: 'أطقم', slug: 'sets' },
    { name: 'Watches', nameAr: 'ساعات', slug: 'watches' },
  ];

  const createdCategories = await Promise.all(
    categories.map((c, idx) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: {},
        create: { ...c, parentId: jewelry.id, sortOrder: idx + 1 },
      }),
    ),
  );

  // ============ Gold Rates (today) ============
  const rates = [
    { karat: Karat.K24, rate: 32.5 },
    { karat: Karat.K22, rate: 29.8 },
    { karat: Karat.K21, rate: 28.5 },
    { karat: Karat.K18, rate: 24.4 },
    { karat: Karat.K14, rate: 19.0 },
  ];

  for (const r of rates) {
    await prisma.goldRate.create({
      data: {
        metalType: MetalType.GOLD,
        karat: r.karat,
        ratePerGram: r.rate,
        currency: 'OMR',
        source: 'seed',
      },
    });
  }

  // ============ Sample Supplier ============
  const supplier = await prisma.supplier.upsert({
    where: { code: 'SUP-001' },
    update: {},
    create: {
      code: 'SUP-001',
      name: 'Al-Zahab Trading',
      nameAr: 'مؤسسة الذهب التجارية',
      contactName: 'محمد الزهبي',
      phone: '+96899887766',
      email: 'sales@alzahab.example',
      taxNumber: 'OM1234567890',
    },
  });

  // ============ Sample Products ============
  const ringsCategory = createdCategories.find((c) => c.slug === 'rings')!;
  const necklacesCategory = createdCategories.find((c) => c.slug === 'necklaces')!;

  await prisma.product.upsert({
    where: { sku: 'GR22K-2605-00001' },
    update: {},
    create: {
      sku: 'GR22K-2605-00001',
      barcode: 'GR22K260500001',
      name: 'Classic Gold Ring',
      nameAr: 'خاتم ذهب كلاسيكي',
      categoryId: ringsCategory.id,
      branchId: mainBranch.id,
      supplierId: supplier.id,
      metalType: MetalType.GOLD,
      karat: Karat.K22,
      grossWeight: 8.5,
      netWeight: 8.5,
      stoneWeight: 0,
      makingChargePerGram: 5,
      size: '18',
      receivedAt: new Date(),
    },
  });

  await prisma.product.upsert({
    where: { sku: 'GR18K-2605-00001' },
    update: {},
    create: {
      sku: 'GR18K-2605-00001',
      barcode: 'GR18K260500001',
      name: 'Diamond Engagement Ring',
      nameAr: 'خاتم خطوبة بالألماس',
      categoryId: ringsCategory.id,
      branchId: mainBranch.id,
      supplierId: supplier.id,
      metalType: MetalType.GOLD,
      karat: Karat.K18,
      grossWeight: 5.2,
      netWeight: 4.7,
      stoneWeight: 0.5,
      makingCharge: 50,
      hallmark: 'OM-AU750',
      hallmarkAuthority: 'هيئة المعادن النفيسة العمانية',
      size: '16',
      receivedAt: new Date(),
      stones: {
        create: [
          {
            stoneType: 'Diamond',
            stoneTypeAr: 'ألماس',
            count: 1,
            caratWeight: 0.5,
            clarity: 'VS1',
            color: 'F',
            cut: 'Excellent',
            shape: 'Round',
            certificateNo: 'GIA-1234567890',
            pricePerCarat: 3000,
            totalValue: 1500,
          },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: { sku: 'GR22K-2605-00002' },
    update: {},
    create: {
      sku: 'GR22K-2605-00002',
      barcode: 'GR22K260500002',
      name: 'Gold Chain Necklace',
      nameAr: 'سلسلة ذهب',
      categoryId: necklacesCategory.id,
      branchId: branch2.id,
      supplierId: supplier.id,
      metalType: MetalType.GOLD,
      karat: Karat.K22,
      grossWeight: 22.3,
      netWeight: 22.3,
      stoneWeight: 0,
      makingChargePerGram: 4,
      receivedAt: new Date(),
    },
  });

  console.log('✅ تم البذر بنجاح');
  console.log(`   - 2 branches`);
  console.log(`   - ${createdCategories.length + 1} categories`);
  console.log(`   - ${rates.length} gold rates`);
  console.log(`   - 1 supplier, 3 products`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
