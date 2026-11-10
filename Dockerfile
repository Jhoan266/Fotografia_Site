FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs
COPY --chown=1001:1001 --from=builder /app/public ./public
COPY --chown=1001:1001 --from=builder /app/prisma ./prisma
COPY --chown=1001:1001 --from=builder /app/package.json ./package.json
COPY --chown=1001:1001 --from=builder /app/package-lock.json ./package-lock.json
COPY --chown=1001:1001 --from=builder /app/node_modules ./node_modules
COPY --chown=1001:1001 --from=builder /app/.next ./.next
COPY --chown=1001:1001 --from=builder /app/next.config.ts ./next.config.ts
COPY --chown=1001:1001 docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh && mkdir -p /app/storage/originals /app/storage/thumbs && chown -R nextjs:nodejs /app/storage
USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
