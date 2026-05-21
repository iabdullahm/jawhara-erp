# ============================================================
# JawharaERP API — Dockerfile (root level for Railway auto-detect)
# Build context: monorepo root
# Builds and runs the NestJS API only.
# ============================================================

# ====================== Builder ======================
FROM node:20-alpine AS builder

WORKDIR /app

# تثبيت pnpm
RUN npm install -g pnpm@9

# نسخ ملفات الـ workspace
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./
COPY tsconfig.base.json ./

# نسخ package.json لكل الـ workspaces (pnpm يحتاج رؤية كل المساحة)
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# تثبيت dependencies للـ api فقط (filter)
RUN pnpm install --filter @jawhara/api... --no-frozen-lockfile

# نسخ مصدر الـ api
COPY apps/api ./apps/api

# توليد Prisma Client + بناء التطبيق
WORKDIR /app/apps/api
RUN pnpm prisma generate
RUN pnpm exec nest build

# ====================== Runner ======================
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@9

# نسخ الملفات الضرورية للتشغيل فقط
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api

ENV NODE_ENV=production
EXPOSE 4000

# تطبيق Migrations ثم بدء التطبيق
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main.js"]
