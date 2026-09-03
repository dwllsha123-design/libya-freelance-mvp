# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL=https://api.libyanfreelance.ly/api
ARG NEXT_PUBLIC_SITE_URL=https://libyanfreelance.ly
ARG NEXT_PUBLIC_ADMIN_URL=https://admin.libyanfreelance.ly
ARG NEXT_PUBLIC_SOCKET_URL=https://api.libyanfreelance.ly
ARG NEXT_PUBLIC_MEDIA_ORIGIN=
ARG NEXT_PUBLIC_IMAGE_HOSTS=

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_ADMIN_URL=${NEXT_PUBLIC_ADMIN_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_PUBLIC_MEDIA_ORIGIN=${NEXT_PUBLIC_MEDIA_ORIGIN}
ENV NEXT_PUBLIC_IMAGE_HOSTS=${NEXT_PUBLIC_IMAGE_HOSTS}

RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["node", "server.js"]
