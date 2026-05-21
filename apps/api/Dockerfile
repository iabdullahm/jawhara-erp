# ============= Stage 1: Builder =============
FROM node:20-alpine AS builder

WORKDIR /app

# تثبيت pnpm
RUN npm install -g pnpm@9

# نسخ ملفات إعدادات Monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/

# تثبيت كل الحزم
RUN pnpm install --no-frozen-lockfile

# نسخ كود التطبيق
COPY apps/api ./apps/api

# توليد Prisma Client وبناء التطبيق
WORKDIR /app/apps/api
RUN pnpm prisma generate
RUN pnpm build

# ============= Stage 2: Runner =============
FROM node:20-alpine AS runner

WORKDIR /app

# تثبيت pnpm فقط
RUN npm install -g pnpm@9

# نسخ ما يحتاج فقط للتشغيل
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api

EXPOSE 4000

# عند البدء: نطبق Migrations ثم نشغل التطبيق
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main.js"]
