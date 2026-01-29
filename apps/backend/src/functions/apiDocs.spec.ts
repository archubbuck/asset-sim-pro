import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the OpenAPI registry
vi.mock('../lib/openapi-registry', () => ({
  generateOpenAPISpec: vi.fn(() => ({
    openapi: '3.0.0',
    info: {
      title: 'AssetSim Pro API',
      version: '1.0.0',
    },
    paths: {},
  })),
}));

vi.mock('@azure/functions', () => ({
  HttpRequest: vi.fn(),
  InvocationContext: vi.fn(),
  app: { http: vi.fn() },
}));

import { HttpRequest, InvocationContext } from '@azure/functions';
import { apiDocs } from './apiDocs';
import { generateOpenAPISpec } from '../lib/openapi-registry';

/**
 * apiDocs function tests
 * 
 * Tests for ADR-017 API Documentation endpoint
 */
describe('apiDocs', () => {
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {} as HttpRequest;

    mockContext = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as InvocationContext;
  });

  it('should return OpenAPI specification', async () => {
    const response = await apiDocs(mockRequest, mockContext);

    expect(response.status).toBe(200);
    expect(response.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    });
    expect(response.jsonBody).toBeDefined();
    expect(response.jsonBody).toHaveProperty('openapi', '3.0.0');
    expect(response.jsonBody).toHaveProperty('info');
    expect(generateOpenAPISpec).toHaveBeenCalled();
  });

  it('should log when generating specification', async () => {
    await apiDocs(mockRequest, mockContext);

    expect(mockContext.log).toHaveBeenCalledWith('Generating OpenAPI specification');
  });

  it('should warn when accessed in production', async () => {
    const originalEnv = process.env.AZURE_FUNCTIONS_ENVIRONMENT;
    process.env.AZURE_FUNCTIONS_ENVIRONMENT = 'production';

    await apiDocs(mockRequest, mockContext);

    expect(mockContext.warn).toHaveBeenCalledWith(
      'API documentation endpoint accessed in production environment'
    );

    // Restore original environment
    if (originalEnv === undefined) {
      delete process.env.AZURE_FUNCTIONS_ENVIRONMENT;
    } else {
      process.env.AZURE_FUNCTIONS_ENVIRONMENT = originalEnv;
    }
  });

  it('should handle errors gracefully', async () => {
    // Make generateOpenAPISpec throw an error
    vi.mocked(generateOpenAPISpec).mockImplementationOnce(() => {
      throw new Error('Mock error');
    });

    const response = await apiDocs(mockRequest, mockContext);

    expect(response.status).toBe(500);
    expect(response.jsonBody).toMatchObject({
      type: 'https://assetsim.com/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to generate API documentation',
    });
    expect(mockContext.error).toHaveBeenCalled();
  });

  it('should set appropriate cache headers', async () => {
    const response = await apiDocs(mockRequest, mockContext);

    expect(response.headers).toBeDefined();
    const headers = response.headers as Record<string, string>;
    expect(headers['Cache-Control']).toBe('public, max-age=3600');
  });
});
