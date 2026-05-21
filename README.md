# JawharaERP

نظام ERP سحابي متخصص لمحلات المجوهرات والذهب.
مستوحى من Jewelsteps، مبني للسوق الخليجي بدعم كامل للعربية و RTL.

> **الحالة الحالية:** Phase 1 — وحدة المخزون والمنتجات (MVP)

---

## المعمارية

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + React Query
- **Backend:** NestJS 10 + TypeScript + Prisma ORM
- **Database:** PostgreSQL 16
- **Cache/Queue:** Redis 7
- **Monorepo:** pnpm workspaces
- **Containers:** Docker Compose

```
jewells-software/
├── apps/
│   ├── api/          # NestJS Backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── products/        # وحدة المنتجات (الأساس)
│   │       ├── categories/      # التصنيفات
│   │       ├── branches/        # الفروع
│   │       ├── gold-rates/      # أسعار الذهب اليومية
│   │       ├── stock-movements/ # حركات المخزون
│   │       └── prisma/          # PrismaService
│   └── web/          # Next.js Frontend
│       └── src/
│           ├── app/
│           │   ├── page.tsx               # لوحة التحكم
│           │   ├── products/              # المنتجات
│           │   ├── gold-rates/            # أسعار الذهب
│           │   └── ...
│           ├── components/
│           └── lib/
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## المتطلبات

- **Node.js** ≥ 20.0.0
- **pnpm** ≥ 8.0.0 (`npm install -g pnpm`)
- **Docker** + Docker Compose
- **PostgreSQL 16** (يأتي عبر Docker)

---

## التشغيل لأول مرة

### 1) نسخ ملف البيئة

```bash
cp .env.example .env
```

> راجع ملف `.env` وتأكد من القيم. القيم الافتراضية تعمل مع Docker Compose.

### 2) تشغيل قاعدة البيانات و Redis

```bash
pnpm db:up
```

سيُشغّل:
- PostgreSQL على `localhost:5432`
- Redis على `localhost:6379`
- Adminer (واجهة DB) على `http://localhost:8080`

### 3) تثبيت الحزم

```bash
pnpm install
```

### 4) توليد Prisma Client وتطبيق Migration

```bash
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate    # سيطلب اسم الـ migration، اكتب "init"
cd ../..
```

### 5) بذر قاعدة البيانات (بيانات تجريبية)

```bash
pnpm db:seed
```

سيُنشئ:
- 2 فروع
- 7 تصنيفات
- 5 أسعار ذهب (لجميع العيارات)
- 1 مورد، 3 منتجات تجريبية

### 6) تشغيل التطبيق

في تيرمنالين منفصلين:

```bash
# Terminal 1 — Backend
pnpm api:dev
# → http://localhost:4000
# → http://localhost:4000/api/docs  (Swagger)
```

```bash
# Terminal 2 — Frontend
pnpm web:dev
# → http://localhost:3000
```

أو الأمر الموحّد:

```bash
pnpm dev   # يشغل الـ API والـ Web بالتوازي
```

---

## الـ Endpoints الأساسية (API)

كل المسارات تحت `/api/v1`:

### Products — المنتجات

| Method | Path                        | الوصف                                 |
|--------|----------------------------|---------------------------------------|
| POST   | `/products`                | إنشاء منتج جديد                       |
| GET    | `/products`                | قائمة (مع فلترة وبحث وتصفح)            |
| GET    | `/products/:id`            | تفاصيل منتج                            |
| GET    | `/products/:id/price`      | **حساب السعر اللحظي** (مع breakdown)   |
| GET    | `/products/barcode/:code`  | بحث بالباركود/SKU/RFID (POS)           |
| PATCH  | `/products/:id`            | تعديل                                  |
| DELETE | `/products/:id`            | حذف ناعم                               |

### Gold Rates — أسعار الذهب

| Method | Path                       | الوصف                                  |
|--------|---------------------------|----------------------------------------|
| POST   | `/gold-rates`             | إدخال سعر جديد                          |
| GET    | `/gold-rates/today`       | الأسعار الحالية لجميع العيارات         |
| GET    | `/gold-rates/history/:k`  | تاريخ الأسعار لعيار محدد (آخر 30 يوم) |

### بقية الموارد

- `/branches` — CRUD للفروع
- `/categories` — CRUD للتصنيفات (مع `/tree` للهيكل الهرمي)
- `/stock-movements` — استعراض حركات المخزون
- `/health` — فحص الحالة

---

## الميزات المكتملة في هذه المرحلة (Phase 1)

- ✅ إدارة الفروع والتصنيفات الهرمية
- ✅ إدخال أسعار الذهب اليومية لكل عيار
- ✅ إنشاء منتجات مع جميع تفاصيل المجوهرات (وزن، أحجار، شهادات GIA)
- ✅ توليد SKU و Barcode تلقائياً
- ✅ التحقق المنطقي من الأوزان (net + stone = gross)
- ✅ **حساب السعر اللحظي:** (وزن × سعر الذهب) + الأحجار + أجرة الصياغة
- ✅ بحث بالباركود (جاهز لشاشة POS)
- ✅ سجل آلي لحركات المخزون
- ✅ Soft delete (لا تُحذف السجلات المالية فعلياً)
- ✅ Swagger documentation
- ✅ واجهة عربية كاملة بدعم RTL
- ✅ لوحة تحكم بأسعار الذهب
- ✅ صفحات إدارة المنتجات (قائمة + إنشاء + تفاصيل)

---

## ما الذي سيأتي (Roadmap)

### Phase 2 — POS & Sales
- نظام المصادقة (JWT + RBAC)
- شاشة نقطة البيع (POS)
- إنشاء فواتير
- استبدال الذهب القديم
- طرق دفع متعددة في الفاتورة

### Phase 3 — CRM
- إدارة العملاء + برامج الولاء
- المديونيات والآجلة
- إدارة الموردين والمشتريات

### Phase 4 — Accounting
- شجرة الحسابات
- القيود التلقائية
- VAT والامتثال (ZATCA / FTA)
- التقارير المالية

### Phase 5 — Advanced
- Multi-branch تحويلات
- تصنيع وورشة الصياغة
- تطبيقات الجوال
- تكامل RFID

---

## أوامر مفيدة

```bash
# تشغيل قاعدة البيانات فقط
pnpm db:up

# إيقاف الكونتينرز
pnpm db:down

# عرض قاعدة البيانات بصرياً
pnpm db:studio        # Prisma Studio على :5555
# أو
# Adminer على http://localhost:8080
# Server: postgres | User: jawhara | Pass: jawhara_dev_pwd | DB: jawhara_erp

# إعادة بذر البيانات
pnpm db:seed

# Migration جديد بعد تعديل schema.prisma
cd apps/api && pnpm prisma:migrate
```

---

## ملاحظات تقنية مهمة

### دقة الأرقام
كل الأوزان تُخزَّن بـ `Decimal(12, 4)` (4 منازل عشرية = دقة 0.0001 جرام).
كل الأسعار `Decimal(14, 4)`. **لا تستخدم Float أبداً** في الحسابات المالية.

### معادلة حساب السعر
```
السعر النهائي =
  (الوزن الصافي × سعر الجرام للعيار)
+ (قيمة الأحجار: مجموع totalValue أو pricePerCarat × caratWeight)
+ أجرة الصياغة المقطوعة
+ (أجرة الصياغة بالجرام × الوزن الصافي)
```

### أمان البيانات
- Soft delete على المنتجات (لا حذف فعلي بسبب السجلات المالية)
- سجل StockMovement مغلق — لا يُعدَّل بعد الإنشاء (sealed)
- Audit log سيُضاف في Phase 4

### الامتثال الضريبي (قادم)
- VAT انتقائي: الذهب الخام بدون، الأجرة بـ VAT
- ZATCA Phase 2 (السعودية) — فوترة إلكترونية موقّعة
- FTA (الإمارات) — متطلبات الفاتورة الضريبية

---

## استكشاف الأخطاء

### `prisma generate` يفشل
```bash
cd apps/api
rm -rf node_modules/.prisma
pnpm prisma:generate
```

### الفرونت لا يتصل بالباك
- تأكد أن الـ API يعمل على `http://localhost:4000`
- راجع `NEXT_PUBLIC_API_URL` في `.env`
- افتح Console في المتصفح لرؤية الخطأ

### قاعدة البيانات فارغة بعد restart
البيانات محفوظة في Docker volume `postgres_data`. إذا حذفته:
```bash
pnpm db:down
docker volume rm jewells-software_postgres_data
pnpm db:up
# ثم migrate + seed
```

---

## الترخيص والمالك

JawharaERP — مشروع خاص.
المطوّر: عبدالله الجهوري.
