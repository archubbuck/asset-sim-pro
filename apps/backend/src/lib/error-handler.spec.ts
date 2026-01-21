import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import * as sql from 'mssql';
import {
  createProblemDetailsResponse,
  createValidationErrorResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createInsufficientFundsResponse,
  createServiceUnavailableResponse,
  createInternalErrorResponse,
  handleSqlError,
  handleError,
} from './error-handler';
import { ErrorTypes, ErrorTitles } from '@assetsim/shared/error-models';

describe('error-handler', () => {
  describe('createProblemDetailsResponse', () => {
    it('should create a response with correct status and content-type', () => {
      const response = createProblemDetailsResponse({
        type: ErrorTypes.NOT_FOUND,
        title: ErrorTitles.NOT_FOUND,
        status: 404,
        detail: 'Resource not found',
      });

      expect(response.status).toBe(404);
      expect(response.headers?.['Content-Type']).toBe('application/problem+json');
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.NOT_FOUND,
        title: ErrorTitles.NOT_FOUND,
        status: 404,
        detail: 'Resource not found',
      });
    });

    it('should include instance when provided', () => {
      const response = createProblemDetailsResponse({
        type: ErrorTypes.NOT_FOUND,
        title: ErrorTitles.NOT_FOUND,
        status: 404,
        detail: 'Order not found',
        instance: '/orders/123',
      });

      expect(response.jsonBody).toMatchObject({
        instance: '/orders/123',
      });
    });
  });

  describe('createValidationErrorResponse', () => {
    it('should create a validation error response from ZodError', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const result = schema.safeParse({ email: 'invalid', age: 15 });
      
      if (!result.success) {
        const response = createValidationErrorResponse(result.error);

        expect(response.status).toBe(400);
        expect(response.jsonBody).toMatchObject({
          type: ErrorTypes.VALIDATION_ERROR,
          title: ErrorTitles.VALIDATION_ERROR,
          status: 400,
          detail: 'Invalid request body',
        });
        expect((response.jsonBody as any).errors).toHaveLength(2);
      } else {
        throw new Error('Expected validation to fail');
      }
    });
  });

  describe('createUnauthorizedResponse', () => {
    it('should create an unauthorized response with default detail', () => {
      const response = createUnauthorizedResponse();

      expect(response.status).toBe(401);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.UNAUTHORIZED,
        title: ErrorTitles.UNAUTHORIZED,
        status: 401,
        detail: 'Authentication required',
      });
    });

    it('should create an unauthorized response with custom detail', () => {
      const response = createUnauthorizedResponse('Invalid token', '/api/orders');

      expect(response.jsonBody).toMatchObject({
        detail: 'Invalid token',
        instance: '/api/orders',
      });
    });
  });

  describe('createForbiddenResponse', () => {
    it('should create a forbidden response', () => {
      const response = createForbiddenResponse('Insufficient permissions');

      expect(response.status).toBe(403);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.FORBIDDEN,
        title: ErrorTitles.FORBIDDEN,
        status: 403,
        detail: 'Insufficient permissions',
      });
    });
  });

  describe('createNotFoundResponse', () => {
    it('should create a not found response', () => {
      const response = createNotFoundResponse('Exchange not found', '/exchanges/123');

      expect(response.status).toBe(404);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.NOT_FOUND,
        title: ErrorTitles.NOT_FOUND,
        status: 404,
        detail: 'Exchange not found',
        instance: '/exchanges/123',
      });
    });
  });

  describe('createInsufficientFundsResponse', () => {
    it('should create an insufficient funds response', () => {
      const response = createInsufficientFundsResponse(
        'Order value $50,000 exceeds buying power $10,000.',
        '/orders/123'
      );

      expect(response.status).toBe(400);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.INSUFFICIENT_FUNDS,
        title: ErrorTitles.INSUFFICIENT_FUNDS,
        status: 400,
        detail: 'Order value $50,000 exceeds buying power $10,000.',
        instance: '/orders/123',
      });
    });
  });

  describe('createServiceUnavailableResponse', () => {
    it('should create a service unavailable response with default detail', () => {
      const response = createServiceUnavailableResponse();

      expect(response.status).toBe(503);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.SERVICE_UNAVAILABLE,
        title: ErrorTitles.SERVICE_UNAVAILABLE,
        status: 503,
        detail: 'Service temporarily unavailable. Please try again later.',
      });
    });
  });

  describe('createInternalErrorResponse', () => {
    it('should create an internal error response with default detail', () => {
      const response = createInternalErrorResponse();

      expect(response.status).toBe(500);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.INTERNAL_ERROR,
        title: ErrorTitles.INTERNAL_ERROR,
        status: 500,
      });
    });
  });

  describe('handleSqlError', () => {
    it('should handle connection errors', () => {
      const error = {
        code: 'ECONNREFUSED',
        number: 0,
      } as sql.RequestError;

      const response = handleSqlError(error);

      expect(response.status).toBe(503);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.SERVICE_UNAVAILABLE,
        detail: 'Database connection error. Please try again in a moment.',
      });
    });

    it('should handle permission errors', () => {
      const error = {
        code: '',
        number: 229, // SELECT permission denied
      } as sql.RequestError;

      const response = handleSqlError(error);

      expect(response.status).toBe(403);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.FORBIDDEN,
      });
    });

    it('should handle foreign key constraint violations', () => {
      const error = {
        code: '',
        number: 547, // FK constraint violation
      } as sql.RequestError;

      const response = handleSqlError(error);

      expect(response.status).toBe(400);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.VALIDATION_ERROR,
        detail: 'Referenced resource does not exist.',
      });
    });

    it('should return internal error for unknown SQL errors', () => {
      const error = {
        code: '',
        number: 9999,
      } as sql.RequestError;

      const response = handleSqlError(error);

      expect(response.status).toBe(500);
    });
  });

  describe('handleError', () => {
    it('should handle authentication errors', () => {
      const error = new Error('Unauthorized: Invalid token');

      const response = handleError(error);

      expect(response.status).toBe(401);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.UNAUTHORIZED,
      });
    });

    it('should handle Zod validation errors', () => {
      const schema = z.object({ name: z.string().min(3) });

      const result = schema.safeParse({ name: 'ab' });
      
      if (!result.success) {
        const response = handleError(result.error);

        expect(response.status).toBe(400);
        expect(response.jsonBody).toMatchObject({
          type: ErrorTypes.VALIDATION_ERROR,
        });
      } else {
        throw new Error('Expected validation to fail');
      }
    });

    it('should handle SQL errors', () => {
      const error = {
        code: 'ETIMEOUT',
        number: 0,
      } as sql.RequestError;

      const response = handleError(error);

      expect(response.status).toBe(503);
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');

      const response = handleError(error);

      expect(response.status).toBe(500);
    });

    it('should handle unknown error types', () => {
      const error = 'string error';

      const response = handleError(error);

      expect(response.status).toBe(500);
    });
  });
});
