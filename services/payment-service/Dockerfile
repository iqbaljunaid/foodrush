# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY ../../tsconfig.base.json ./tsconfig.base.json
COPY src/ ./src/

RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts --omit=dev

COPY --from=builder /app/dist ./dist

USER appuser

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3006/healthz || exit 1

CMD ["node", "dist/server.js"]
