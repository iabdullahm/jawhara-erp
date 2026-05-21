# ============================================================
# JawharaERP API — Dockerfile (Single-stage, simple & reliable)
# Build context: monorepo root
# ============================================================

FROM node:20-slim

# تثبيت OpenSSL (Prisma يحتاجها)
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# تثبيت pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# 1. نسخ ملفات إعدادات الـ workspace
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY pnpm-lock.yaml* ./

# 2. نسخ package.json لكل الـ workspaces (pnpm workspace requirement)
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# 3. تثبيت كل الـ dependencies (بما فيها devDependencies للبناء)
RUN pnpm install --filter @jawhara/api... --no-frozen-lockfile

# 4. نسخ مصدر API
COPY apps/api ./apps/api

# 5. الدخول لمجلد api وتوليد Prisma client + بناء التطبيق
WORKDIR /app/apps/api

# Prisma generate
RUN pnpm exec prisma generate

# Build NestJS — يولد dist/main.js
RUN pnpm exec nest build

# 6. التحقق من نجاح البناء (إذا فشل، الـ image لن يُبنى)
RUN ls -la dist/ && test -f dist/main.js && echo "✅ Build verified: dist/main.js exists"

ENV NODE_ENV=production
EXPOSE 4000

# عند التشغيل: sync schema with DB + start
# نستخدم db push لأن المشروع لا يحتوي migrations بعد (MVP).
# في الإنتاج الفعلي، استبدلها بـ prisma migrate deploy + migrations folder.
CMD ["sh", "-c", "pnpm exec prisma db push --accept-data-loss && node dist/main.js"]
