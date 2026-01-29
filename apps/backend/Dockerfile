# Multi-stage Dockerfile for AssetSim Pro Backend (Production)
# This Dockerfile builds Azure Functions and runs them in production mode

# Stage 1: Build stage
FROM node:22-bullseye AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build backend using Nx
RUN npx nx build backend --configuration=production

# Stage 2: Production runtime stage
FROM mcr.microsoft.com/azure-functions/node:4-node20

WORKDIR /home/site/wwwroot

# Copy built application from builder stage
COPY --from=builder /app/apps/backend/dist ./

# Copy node_modules (native modules need to be in final image)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./node_modules_backend

# Set environment variables for Azure Functions
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_WORKER_RUNTIME=node

# Expose Azure Functions default port
EXPOSE 7071

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:7071/api/health || exit 1

# Note: In production, database init is handled by CI/CD pipeline
# This container runs Azure Functions directly
CMD [ "/azure-functions-host/Microsoft.Azure.WebJobs.Script.WebHost" ]
