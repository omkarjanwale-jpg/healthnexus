# Stage 1: Build & Native Compilation
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install native compilation dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies including build-from-source for better-sqlite3 on Alpine
RUN npm ci --only=production

# Stage 2: Production Minimal Runtime
FROM node:20-alpine

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /usr/src/app

# Copy compiled node_modules from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy application source code
COPY package*.json ./
COPY db.js ./
COPY server.js ./
COPY views ./views
COPY public ./public

# Create data directory permissions for SQLite persistent storage
RUN chown -R node:node /usr/src/app

# Switch to non-root secure user
USER node

# Expose target container port (Cloud Run sets PORT=8080 by default)
EXPOSE 8080

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

# Launch production server
CMD ["node", "server.js"]
