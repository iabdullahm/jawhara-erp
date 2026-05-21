# ============================================================
# Dockerfile مستقل لـ JawharaERP API (NestJS + Prisma)
# يُستخدم مع build context = جذر المستودع
# ============================================================

# ====================== Builder ======================
FROM node:20-alpine AS builder

WORKDIR /app

# تثبيت pnpm
RUN npm install -g pnpm@9

# نسخ ملفات الـ workspace كاملة (نحتاج كل package.json لـ pnpm)
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./
COPY tsconfig.base.json ./

# نسخ كل package.json من كل workspace (حتى لو لن نبني web هنا)
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# تثبيت dependencies للـ api فقط
RUN pnpm install --filter @jawhara/api... --no-frozen-lockfile

# نسخ مصدر الـ api
COPY apps/api ./apps/api

# توليد Prisma Client وبناء التطبيق
WORKDIR /app/apps/api
RUN pnpm prisma generate
RUN pnpm exec nest build

# ====================== Runner ======================
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@9

# نسخ ما يحتاج فقط للتشغيل
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api

# Railway/Render تضع PORT تلقائياً
ENV NODE_ENV=production
EXPOSE 4000

# تطبيق Migrations قبل البدء
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main.js"]
