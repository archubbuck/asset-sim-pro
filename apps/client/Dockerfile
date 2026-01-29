# Multi-stage Dockerfile for AssetSim Pro Client (Production)
# This Dockerfile builds the Angular application and serves it via nginx

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/client/package*.json ./apps/client/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build argument for Kendo UI license (sourced from .env file)
ARG KENDO_UI_LICENSE
ENV KENDO_UI_LICENSE=${KENDO_UI_LICENSE}

# Build Angular client with production configuration
RUN npx nx build client --configuration=production

# Stage 2: Production serve stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY apps/client/nginx.conf /etc/nginx/nginx.conf

# Copy built Angular app from builder stage
COPY --from=builder /app/dist/apps/client/browser /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:80 || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
