/**
 * Seed script — يملأ قاعدة البيانات ببيانات مبدئية:
 * - PLATFORM_OWNER (أنت)
 * - Tenant افتراضي (محل تجريبي) + TENANT_OWNER
 * - فروع + تصنيفات + أسعار ذهب + منتجات
 *
 * تشغيل: pnpm --filter @jawhara/api seed
 */
import {
  PrismaClient,
  MetalType,
  Karat,
  UserRole,
  SubscriptionPlan,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 بدء البذر...\n');

  // ============ PLATFORM_OWNER (أنت) ============
  const platformOwnerPassword = process.env.SEED_OWNER_PASSWORD ?? 'Owner@2026';
  const platformOwnerHash = await bcrypt.hash(platformOwnerPassword, 12);

  const platformOwner = await prisma.user.upsert({
    where: { email: 'abdullah-aljahwari@outlook.com' },
    update: {},
    create: {
      email: 'abdullah-aljahwari@outlook.com',
      passwordHash: platformOwnerHash,
      name: 'Abdullah Al-Jahwari',
      nameAr: 'عبدالله الجهوري',
      role: UserRole.PLATFORM_OWNER,
      tenantId: null, // PLATFORM_OWNER لا ينتمي لأي tenant
    },
  });
  console.log(`✅ PLATFORM_OWNER: ${platformOwner.email}`);
  console.log(`   كلمة السر: ${platformOwnerPassword}\n`);

  // ============ Tenant افتراضي (محل تجريبي) ============
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'jawhara-demo' },
    update: {},
    create: {
      slug: 'jawhara-demo',
      name: 'Jawhara Demo Jewelry',
      nameAr: 'مجوهرات جوهرة (تجريبي)',
      phone: '+96812345678',
      email: 'demo@jawhara.com',
      address: 'الموج، مسقط، سلطنة عُمان',
      country: 'OM',
      currency: 'OMR',
      locale: 'ar',
      plan: SubscriptionPlan.PRO,
      trialEndsAt,
      maxBranches: 5,
      maxUsers: 20,
      maxProducts: 10000,
    },
  });
  console.log(`✅ Tenant: ${tenant.nameAr} (${tenant.slug})`);

  // ============ Tenant Owner ============
  const tenantOwnerHash = await bcrypt.hash('Owner@2026', 12);
  const tenantOwner = await prisma.user.upsert({
    where: { email: 'owner@jawhara-demo.com' },
    update: {},
    create: {
      email: 'owner@jawhara-demo.com',
      passwordHash: tenantOwnerHash,
      name: 'Demo Owner',
      nameAr: 'صاحب المحل التجريبي',
      role: UserRole.TENANT_OWNER,
      tenantId: tenant.id,
    },
  });
  console.log(`✅ TENANT_OWNER: ${tenantOwner.email} | كلمة السر: Owner@2026`);

  // ============ موظفين تجريبيين ============
  const managerHash = await bcrypt.hash('Manager@2026', 12);
  await prisma.user.upsert({
    where: { email: 'manager@jawhara-demo.com' },
    update: {},
    create: {
      email: 'manager@jawhara-demo.com',
      passwordHash: managerHash,
      name: 'Demo Manager',
      nameAr: 'مدير الفرع',
      role: UserRole.MANAGER,
      tenantId: tenant.id,
    },
  });
  console.log(`✅ MANAGER: manager@jawhara-demo.com | كلمة السر: Manager@2026`);

  const salesHash = await bcrypt.hash('Sales@2026', 12);
  await prisma.user.upsert({
    where: { email: 'sales@jawhara-demo.com' },
    update: {},
    create: {
      email: 'sales@jawhara-demo.com',
      passwordHash: salesHash,
      name: 'Demo Salesperson',
      nameAr: 'البائع التجريبي',
      role: UserRole.SALESPERSON,
      tenantId: tenant.id,
    },
  });
  console.log(`✅ SALESPERSON: sales@jawhara-demo.com | كلمة السر: Sales@2026\n`);

  // ============ Branches ============
  const mainBranch = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MAIN' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'MAIN',
      name: 'Main Showroom',
      nameAr: 'الفرع الرئيسي',
      address: 'الموج، مسقط',
      phone: '+96812345678',
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MOJ-02' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'MOJ-02',
      name: 'Mall Branch',
      nameAr: 'فرع المول',
      address: 'مول مسقط الكبير',
    },
  });
  console.log(`✅ 2 branches`);

  // ============ Categories ============
  const jewelry = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'jewelry' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Jewelry',
      nameAr: 'مجوهرات',
      slug: 'jewelry',
      sortOrder: 1,
    },
  });

  const categories = [
    { name: 'Rings', nameAr: 'خواتم', slug: 'rings' },
    { name: 'Necklaces', nameAr: 'قلائد', slug: 'necklaces' },
    { name: 'Bracelets', nameAr: 'أساور', slug: 'bracelets' },
    { name: 'Earrings', nameAr: 'أقراط', slug: 'earrings' },
    { name: 'Sets', nameAr: 'أطقم', slug: 'sets' },
  ];

  const createdCategories = await Promise.all(
    categories.map((c, idx) =>
      prisma.category.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug: c.slug } },
        update: {},
        create: {
          ...c,
          tenantId: tenant.id,
          parentId: jewelry.id,
          sortOrder: idx + 1,
        },
      }),
    ),
  );
  console.log(`✅ ${createdCategories.length + 1} categories`);

  // ============ Gold Rates ============
  const rates = [
    { karat: Karat.K24, rate: 36.5 },
    { karat: Karat.K22, rate: 33.5 },
    { karat: Karat.K21, rate: 32.0 },
    { karat: Karat.K18, rate: 27.5 },
    { karat: Karat.K14, rate: 21.5 },
  ];

  for (const r of rates) {
    await prisma.goldRate.create({
      data: {
        tenantId: tenant.id,
        metalType: MetalType.GOLD,
        karat: r.karat,
        ratePerGram: r.rate,
        currency: 'OMR',
        source: 'seed',
      },
    });
  }
  console.log(`✅ ${rates.length} gold rates`);

  // ============ Supplier ============
  const supplier = await prisma.supplier.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SUP-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'SUP-001',
      name: 'Al-Zahab Trading',
      nameAr: 'مؤسسة الذهب التجارية',
      contactName: 'محمد الزهبي',
      phone: '+96899887766',
    },
  });

  // ============ Products ============
  const ringsCategory = createdCategories.find((c) => c.slug === 'rings')!;
  const necklacesCategory = createdCategories.find((c) => c.slug === 'necklaces')!;

  await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'GR22K-2605-00001' } },
    update: {},
    create: {
      tenantId: tenant.id,
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
      pricingMode: 'DYNAMIC',
      size: '18',
      receivedAt: new Date(),
    },
  });

  await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'GR18K-2605-00001' } },
    update: {},
    create: {
      tenantId: tenant.id,
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
      pricingMode: 'HYBRID',
      fixedSalePrice: 1500,
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
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'GR22K-2605-00002' } },
    update: {},
    create: {
      tenantId: tenant.id,
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
      pricingMode: 'DYNAMIC',
      receivedAt: new Date(),
    },
  });
  console.log(`✅ 3 products\n`);

  console.log('🎉 تم البذر بنجاح!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('بيانات تسجيل الدخول:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`PLATFORM_OWNER  → abdullah-aljahwari@outlook.com / ${platformOwnerPassword}`);
  console.log('TENANT_OWNER    → owner@jawhara-demo.com / Owner@2026');
  console.log('MANAGER         → manager@jawhara-demo.com / Manager@2026');
  console.log('SALESPERSON     → sales@jawhara-demo.com / Sales@2026');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
