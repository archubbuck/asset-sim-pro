import { describe, it, expect } from 'vitest';
import { generateOpenAPISpec, registry } from './openapi-registry';

/**
 * OpenAPI Registry tests
 * 
 * Tests for ADR-017 OpenAPI documentation generation
 */
describe('openapi-registry', () => {
  describe('generateOpenAPISpec', () => {
    it('should generate a valid OpenAPI v3 specification', () => {
      const spec = generateOpenAPISpec();

      expect(spec).toBeDefined();
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('AssetSim Pro API');
      expect(spec.info.version).toBe('1.0.0');
    });

    it('should include server configurations', () => {
      const spec = generateOpenAPISpec();

      expect(spec.servers).toBeDefined();
      expect(spec.servers?.length).toBeGreaterThan(0);
      
      const serverUrls = spec.servers?.map(s => s.url);
      expect(serverUrls).toContain('https://api.assetsim.com');
      expect(serverUrls).toContain('https://api-staging.assetsim.com');
      expect(serverUrls).toContain('http://localhost:7071');
    });

    it('should include security schemes', () => {
      const spec = generateOpenAPISpec();

      expect(spec.components).toBeDefined();
      expect(spec.components?.securitySchemes).toBeDefined();
      expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
      expect(spec.components?.securitySchemes?.bearerAuth).toMatchObject({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });
    });

    it('should include defined tags', () => {
      const spec = generateOpenAPISpec();

      expect(spec.tags).toBeDefined();
      expect(spec.tags?.length).toBeGreaterThan(0);
      
      const tagNames = spec.tags?.map(t => t.name);
      expect(tagNames).toContain('Orders');
      expect(tagNames).toContain('Exchanges');
    });

    it('should include registered paths', () => {
      const spec = generateOpenAPISpec();

      expect(spec.paths).toBeDefined();
      expect(Object.keys(spec.paths ?? {})).toContain('/api/v1/orders');
      expect(Object.keys(spec.paths ?? {})).toContain('/api/v1/exchanges');
    });

    it('should have POST method for /api/v1/orders', () => {
      const spec = generateOpenAPISpec();

      expect(spec.paths?.['/api/v1/orders']).toBeDefined();
      expect(spec.paths?.['/api/v1/orders']?.post).toBeDefined();
      expect(spec.paths?.['/api/v1/orders']?.post?.summary).toBe('Create a new order');
      expect(spec.paths?.['/api/v1/orders']?.post?.tags).toContain('Orders');
    });

    it('should have POST method for /api/v1/exchanges', () => {
      const spec = generateOpenAPISpec();

      expect(spec.paths?.['/api/v1/exchanges']).toBeDefined();
      expect(spec.paths?.['/api/v1/exchanges']?.post).toBeDefined();
      expect(spec.paths?.['/api/v1/exchanges']?.post?.summary).toBe('Create a new exchange');
      expect(spec.paths?.['/api/v1/exchanges']?.post?.tags).toContain('Exchanges');
    });

    it('should include error response schemas', () => {
      const spec = generateOpenAPISpec();

      expect(spec.paths?.['/api/v1/orders']?.post?.responses).toBeDefined();
      const responses = spec.paths?.['/api/v1/orders']?.post?.responses ?? {};
      
      expect(responses['201']).toBeDefined();
      expect(responses['400']).toBeDefined();
      expect(responses['401']).toBeDefined();
      expect(responses['403']).toBeDefined();
      expect(responses['500']).toBeDefined();
    });

    it('should include request body schemas', () => {
      const spec = generateOpenAPISpec();

      const orderRequest = spec.paths?.['/api/v1/orders']?.post?.requestBody;
      expect(orderRequest).toBeDefined();
      if (orderRequest && 'content' in orderRequest) {
        expect(orderRequest.content?.['application/json']).toBeDefined();
      }

      const exchangeRequest = spec.paths?.['/api/v1/exchanges']?.post?.requestBody;
      expect(exchangeRequest).toBeDefined();
      if (exchangeRequest && 'content' in exchangeRequest) {
        expect(exchangeRequest.content?.['application/json']).toBeDefined();
      }
    });

    it('should include security requirements', () => {
      const spec = generateOpenAPISpec();

      const orderSecurity = spec.paths?.['/api/v1/orders']?.post?.security;
      expect(orderSecurity).toBeDefined();
      expect(orderSecurity?.[0]).toHaveProperty('bearerAuth');

      const exchangeSecurity = spec.paths?.['/api/v1/exchanges']?.post?.security;
      expect(exchangeSecurity).toBeDefined();
      expect(exchangeSecurity?.[0]).toHaveProperty('bearerAuth');
    });
  });

  describe('registry', () => {
    it('should be defined', () => {
      expect(registry).toBeDefined();
    });

    it('should have definitions', () => {
      expect(registry.definitions).toBeDefined();
      expect(registry.definitions.length).toBeGreaterThan(0);
    });
  });
});
