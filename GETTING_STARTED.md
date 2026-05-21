# بدء التشغيل السريع — JawharaERP

> **5 دقائق من صفر إلى تشغيل كامل**

## الخطوات

```bash
# 1) أنشئ ملف البيئة
cp .env.example .env

# 2) شغّل قاعدة البيانات
docker compose up -d postgres redis

# 3) ثبّت الحزم
pnpm install

# 4) أنشئ الجداول وأدخل بيانات تجريبية
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate   # اكتب "init" عند السؤال
pnpm seed
cd ../..

# 5) شغّل التطبيق
pnpm dev
```

افتح:
- **التطبيق:** http://localhost:3000
- **API:** http://localhost:4000
- **Swagger:** http://localhost:4000/api/docs
- **Adminer (DB):** http://localhost:8080

## جرّب فوراً

1. اذهب لـ http://localhost:3000 — سترى لوحة التحكم
2. **أسعار الذهب** — معبأة بـ 5 عيارات (24, 22, 21, 18, 14)
3. **المنتجات** — 3 منتجات تجريبية (خاتم ذهب، خاتم ألماس، سلسلة)
4. اضغط على أي منتج → اضغط "احسب السعر الآن" → سترى الحساب اللحظي

## للاختبار عبر API مباشرة

```bash
# اطلب قائمة المنتجات
curl http://localhost:4000/api/v1/products

# احسب سعر منتج
curl http://localhost:4000/api/v1/products/{id}/price

# أدخل سعر ذهب جديد
curl -X POST http://localhost:4000/api/v1/gold-rates \
  -H "Content-Type: application/json" \
  -d '{"metalType":"GOLD","karat":"K22","ratePerGram":30.5}'
```
