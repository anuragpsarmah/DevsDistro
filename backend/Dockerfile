# Build stage
FROM node:25-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM ghcr.io/platformatic/node-caged:25-slim AS production

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder --chown=node:node /app/dist ./dist
RUN chown -R node:node /app

USER node

EXPOSE 3000
# Default: API server. Worker containers override CMD with "node dist/worker.js"
CMD ["node", "dist/index.js"]
