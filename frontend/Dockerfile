FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Development ─────────────────────────────────────────────────────────────
FROM base AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Builder (para producción) ────────────────────────────────────────────────
FROM base AS builder
COPY . .
RUN npm run build

# ── Production ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
