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

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Migrations run in CI/release job BEFORE deploying this image:
#   DATABASE_URL=... node node_modules/prisma/build/index.js migrate deploy
# (uses build-stage image or separate migrate job — NOT this runtime container)

EXPOSE 4000
CMD ["node", "dist/main.js"]
