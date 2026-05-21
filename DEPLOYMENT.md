# دليل النشر — JawharaERP

> **معمارية النشر:**
> - 🌐 **Frontend (Next.js)** → Vercel
> - 🚂 **Backend (NestJS)** → Railway
> - 🐘 **Database (PostgreSQL)** → Neon
>
> **التكلفة:** كلها مجانية للبداية. تكفي لمئات المستخدمين.

---

## الخطوة 0 — قبل البدء

تأكد من:
1. حساب على [GitHub](https://github.com) ورفع الكود (git push)
2. حساب على [Vercel](https://vercel.com) (سجّل بـ GitHub)
3. حساب على [Railway](https://railway.app) (سجّل بـ GitHub)
4. حساب على [Neon](https://neon.tech) (سجّل بـ GitHub)

### رفع الكود على GitHub أولاً

```powershell
cd "C:\Users\abdullah.j\OneDrive - Al Mouj Muscat SAOC\Documents\Claude\Projects\Jewells software"

git init
git add .
git commit -m "Initial commit: JawharaERP Phase 1"

# أنشئ Repository فارغ على github.com باسم jawhara-erp
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jawhara-erp.git
git push -u origin main
```

---

## الخطوة 1 — قاعدة البيانات (Neon)

1. اذهب إلى [neon.tech](https://neon.tech) → **Create a project**
2. اختر:
   - **Name:** `jawhara-erp`
   - **PostgreSQL version:** 16
   - **Region:** الأقرب لجمهورك (مثلاً `eu-central-1` للخليج)
3. بعد الإنشاء، انسخ **Connection String** — يبدو كذا:
   ```
   postgresql://user:pass@ep-xxx-xxx.region.aws.neon.tech/jawhara_erp?sslmode=require
   ```
4. احفظه — ستحتاجه في Railway

---

## الخطوة 2 — Backend (Railway)

### 2.1 إنشاء المشروع

1. اذهب إلى [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. اختر مستودع `jawhara-erp`
3. سيكتشف Railway المشروع تلقائياً

### 2.2 إعداد الخدمة لتشير إلى apps/api

1. في الـ Service، اذهب لـ **Settings** → **Source**
2. **Root Directory:** اكتب `apps/api`
3. **Build Command:** اتركه فارغاً (سيستخدم Dockerfile تلقائياً)
4. **Watch Paths:** `apps/api/**`

### 2.3 إضافة متغيرات البيئة

في تبويب **Variables** أضف:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | (الذي نسخته من Neon) |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | (نص عشوائي طويل) |
| `CORS_ORIGINS` | اتركه فارغاً حالياً، سنضيفه بعد نشر Vercel |
| `DEFAULT_CURRENCY` | `OMR` |
| `DEFAULT_VAT_RATE` | `5` |

> **لتوليد JWT_SECRET آمن:** افتح PowerShell وشغّل:
> ```powershell
> -join ((1..64) | ForEach { [char][int]((65..90) + (97..122) + (48..57) | Get-Random) })
> ```

### 2.4 نشر

1. اضغط **Deploy** — سينشر Railway تلقائياً
2. سيستغرق 3-5 دقائق
3. بعد النجاح، اذهب لـ **Settings** → **Networking** → **Generate Domain**
4. ستحصل على رابط مثل: `https://jawhara-api-production.up.railway.app`
5. **انسخ هذا الرابط** — ستحتاجه لـ Vercel

### 2.5 تطبيق Migrations يدوياً (مرة واحدة فقط)

في Railway، الـ Dockerfile يطبّق migrations تلقائياً عند البدء. لكن للتأكد:

1. اذهب لـ **Settings** → **Custom Start Command** ضع:
   ```
   pnpm prisma migrate deploy && node dist/main.js
   ```
2. أعد النشر

### 2.6 (اختياري) بذر البيانات الأولية

من جهازك:
```powershell
# عيّن متغير البيئة مؤقتاً للاتصال بـ Neon
$env:DATABASE_URL="postgresql://..."  # ضع رابط Neon
cd apps\api
pnpm seed
```

---

## الخطوة 3 — Frontend (Vercel)

### 3.1 إنشاء المشروع (أو إعادة إعداده إذا فشل سابقاً)

1. إذا أنشأت المشروع سابقاً وفشل، احذفه من Vercel أولاً:
   - Project Settings → Advanced → Delete Project
2. **New Project** → اختر مستودع `jawhara-erp`

### 3.2 إعدادات البناء (مهم جداً)

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Root Directory** | `apps/web` |
| **Build Command** | `next build` (يأتي تلقائياً) |
| **Install Command** | `pnpm install --no-frozen-lockfile` |
| **Output Directory** | `.next` (تلقائي) |

> ⚠️ **الأهم:** **Root Directory** يجب أن يكون `apps/web`

### 3.3 متغيرات البيئة

في **Environment Variables** أضف:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://jawhara-api-production.up.railway.app` (الذي حصلت عليه من Railway) |

### 3.4 نشر

1. اضغط **Deploy**
2. سيستغرق 2-3 دقائق
3. بعد النجاح، ستحصل على رابط مثل: `https://jewells-software.vercel.app`

---

## الخطوة 4 — ربط CORS

ارجع لـ Railway → Variables → عدّل `CORS_ORIGINS`:

```
CORS_ORIGINS=https://jewells-software.vercel.app
```

> إذا أضفت دومين مخصص لاحقاً، أضفه بفاصلة:
> ```
> CORS_ORIGINS=https://jewells-software.vercel.app,https://app.jawhara.com
> ```

أعد نشر Railway (Deployments → Redeploy).

---

## الخطوة 5 — التحقق

1. افتح رابط Vercel — يجب أن ترى لوحة التحكم
2. افتح Console (F12) — يجب ألا يكون فيه أخطاء CORS
3. إذا كانت قاعدة البيانات مبذورة، سترى أسعار الذهب والمنتجات
4. اختبر إنشاء منتج جديد

---

## استكشاف الأخطاء

### خطأ "P1001: Can't reach database"
- تأكد أن `DATABASE_URL` في Railway فيها `?sslmode=require` في النهاية
- تحقق من أن قاعدة Neon "Active" وليست "Idle"

### خطأ CORS
- تحقق أن `CORS_ORIGINS` في Railway = رابط Vercel بالضبط (بدون `/` في النهاية)
- أعد نشر Railway

### الواجهة تفتح لكن لا بيانات
- افتح Console (F12) → Network → ابحث عن خطأ
- غالباً `NEXT_PUBLIC_API_URL` في Vercel غير صحيح
- تذكر: متغيرات `NEXT_PUBLIC_*` تتطلب **إعادة بناء** بعد التغيير

### Railway يفشل البناء
- تحقق من Logs في Railway
- تأكد أن `Root Directory` = `apps/api`
- إذا Dockerfile يفشل، جرّب الـ Nixpacks: احذف Dockerfile واستخدم `nixpacks.toml`

### Vercel يفشل البناء
- تأكد أن `Root Directory` = `apps/web` (وليس الجذر)
- تأكد أن `Install Command` = `pnpm install --no-frozen-lockfile`

---

## الترقية للإنتاج الحقيقي (لاحقاً)

عندما تكون جاهزاً لعملاء حقيقيين:

1. **Custom Domain** — اربط `app.jawhara.com` بـ Vercel
2. **Database backups** — فعّل Point-in-time recovery في Neon (Pro tier)
3. **Monitoring** — أضف Sentry للأخطاء
4. **CDN للصور** — Cloudflare R2 أو AWS S3
5. **Rate limiting** — أضف `@nestjs/throttler` للـ API
6. **Logs مركزية** — Datadog أو BetterStack
7. **Region خليجي** — انقل لـ AWS Bahrain أو Azure UAE

---

## التكاليف (تقديرية)

| المرحلة | التكلفة الشهرية |
|---------|------------------|
| MVP (Free tiers) | 0 USD |
| 100 مستخدم نشط | ~25 USD (Neon Pro + Railway Hobby) |
| 1000 مستخدم | ~100 USD |
| 10,000 مستخدم | ~500-1000 USD |

---

## بدائل (إن لم تعجبك Railway)

- **Render.com** — مشابه لـ Railway، أرخص قليلاً
- **Fly.io** — أداء أفضل، إعداد أصعب
- **DigitalOcean App Platform** — موثوق ومستقر
- **AWS App Runner** — أقوى، أعقد، أغلى

كلها تدعم Docker أو Nixpacks المُضمَّن في المشروع.
