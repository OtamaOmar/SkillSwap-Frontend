# Multi-stage build for Vite React app

# --- Build stage ---
FROM node:22-slim AS build
WORKDIR /app

# Install deps
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* /app/
# Prefer npm, fallback if lock files missing
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
    else npm install; fi

# Copy source and build
COPY . /app
RUN npm run build

# --- Runtime stage ---
FROM nginx:1.25-alpine

# Copy build output
COPY --from=build /app/dist /usr/share/nginx/html

# Copy basic nginx config optimized for SPA routing
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Expose web port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

# Default command (inherited from nginx)
