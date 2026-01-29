import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { generateOpenAPISpec } from '../lib/openapi-registry';

/**
 * GET /api/docs
 * 
 * Returns the OpenAPI v3 specification for the AssetSim Pro API
 * Implements ADR-017: API Documentation & Standards
 * 
 * **Security Note:** This endpoint should only be exposed in Dev/Staging environments.
 * Production deployment should disable this endpoint or require authentication.
 */
export async function apiDocs(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Check if we're in a development/staging environment
    const environment = process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'development';
    
    // For production, this endpoint should be disabled or require authentication
    if (environment === 'production') {
      context.warn('API documentation endpoint accessed in production environment');
      
      // Optionally return 404 in production to hide the endpoint
      // Uncomment the following lines to disable in production:
      // return {
      //   status: 404,
      //   jsonBody: {
      //     type: 'https://assetsim.com/errors/not-found',
      //     title: 'Not Found',
      //     status: 404,
      //     detail: 'API documentation is not available in production',
      //   },
      // };
    }

    context.log('Generating OpenAPI specification');

    // Generate the OpenAPI spec
    const spec = generateOpenAPISpec();

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
      jsonBody: spec,
    };
  } catch (error) {
    context.error('Error generating OpenAPI specification:', error);

    return {
      status: 500,
      jsonBody: {
        type: 'https://assetsim.com/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to generate API documentation',
      },
    };
  }
}

// Register the HTTP trigger
app.http('apiDocs', {
  methods: ['GET'],
  route: 'docs',
  authLevel: 'anonymous', // Public in dev/staging; should be restricted in production
  handler: apiDocs,
});
