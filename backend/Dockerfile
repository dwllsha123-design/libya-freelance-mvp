# syntax=docker/dockerfile:1

# =============================================================================
# Libya Freelance — Backend multi-stage production image
# Build/migrate stage has Prisma CLI; runtime stage has production deps only.
# Generated Prisma Client is copied deterministically — never manual steps.
# =============================================================================

# --- Stage 1: build + generate ------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY prisma ./prisma
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN node node_modules/prisma/build/index.js generate \
 && npm run build

# --- Stage 2: production runtime ----------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps \
 && rm -rf \
      node_modules/prisma \
      node_modules/typescript \
      node_modules/deepmerge-ts \
      node_modules/@prisma/config

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Migrations: Railway pre-deploy / compose migrate profile (NOT automatic at boot):
#   npx prisma migrate deploy
# API runtime must boot with STORAGE_DRIVER=s3 (enforced by StorageModule).

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["node", "dist/main.js"]
