import { describe, it, expect, vi } from 'vitest';
import { getUserFromRequest, requireAuthentication, UserPrincipal } from './auth';
import { HttpRequest } from '@azure/functions';

describe('auth', () => {
  describe('getUserFromRequest', () => {
    it('should extract user from x-ms-client-principal header', () => {
      const principal = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        userDetails: 'test@example.com',
        identityProvider: 'aad',
        userRoles: ['authenticated', 'admin']
      };

      const encodedPrincipal = Buffer.from(JSON.stringify(principal)).toString('base64');
      
      const mockHeaders = new Map();
      mockHeaders.set('x-ms-client-principal', encodedPrincipal);
      
      const mockRequest = {
        headers: {
          get: (key: string) => mockHeaders.get(key)
        }
      } as unknown as HttpRequest;

      const result = getUserFromRequest(mockRequest);

      expect(result).toEqual(principal);
    });

    it('should return null when no principal header is present', () => {
      const mockRequest = {
        headers: {
          get: () => null
        }
      } as unknown as HttpRequest;

      // Set NODE_ENV to non-development to avoid fallback
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = getUserFromRequest(mockRequest);

      expect(result).toBeNull();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle principal with alternative field names', () => {
      const principal = {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test User',
        identityProvider: 'aad'
      };

      const encodedPrincipal = Buffer.from(JSON.stringify(principal)).toString('base64');
      
      const mockHeaders = new Map();
      mockHeaders.set('x-ms-client-principal', encodedPrincipal);
      
      const mockRequest = {
        headers: {
          get: (key: string) => mockHeaders.get(key)
        }
      } as unknown as HttpRequest;

      const result = getUserFromRequest(mockRequest);

      expect(result).toBeTruthy();
      expect(result?.userId).toBe(principal.sub);
      expect(result?.userDetails).toBe(principal.name);
    });

    it('should return development user in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockRequest = {
        headers: {
          get: () => null
        }
      } as unknown as HttpRequest;

      const result = getUserFromRequest(mockRequest);

      expect(result).toBeTruthy();
      expect(result?.userId).toBe('00000000-0000-0000-0000-000000000001');
      expect(result?.userDetails).toBe('Developer User');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('requireAuthentication', () => {
    it('should return user when authenticated', () => {
      const principal = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        userDetails: 'test@example.com',
        identityProvider: 'aad',
        userRoles: ['authenticated']
      };

      const encodedPrincipal = Buffer.from(JSON.stringify(principal)).toString('base64');
      
      const mockHeaders = new Map();
      mockHeaders.set('x-ms-client-principal', encodedPrincipal);
      
      const mockRequest = {
        headers: {
          get: (key: string) => mockHeaders.get(key)
        }
      } as unknown as HttpRequest;

      const result = requireAuthentication(mockRequest);

      expect(result).toEqual(principal);
    });

    it('should throw error when not authenticated', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockRequest = {
        headers: {
          get: () => null
        }
      } as unknown as HttpRequest;

      expect(() => requireAuthentication(mockRequest)).toThrow('Unauthorized: No valid user principal found');
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});
