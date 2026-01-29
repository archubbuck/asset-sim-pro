/**
 * Health Check Endpoint for Container Orchestration
 * 
 * This endpoint provides health status for Azure Container Apps, Docker Compose,
 * and Kubernetes health checks. It returns 200 OK when the Functions runtime is ready.
 * 
 * Authentication: Anonymous (required for load balancer health probes)
 * Route: GET /api/health
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function health(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Health check endpoint called');

  // Basic health response
  // In a production system, you might check:
  // - Database connectivity
  // - Redis connectivity
  // - Critical service dependencies
  // For now, returning 200 indicates the Functions runtime is operational

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    },
    jsonBody: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'assetsim-backend',
      runtime: 'azure-functions-node-v4'
    }
  };
}

// Register HTTP trigger with anonymous authentication
app.http('health', {
  methods: ['GET', 'HEAD'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health
});
