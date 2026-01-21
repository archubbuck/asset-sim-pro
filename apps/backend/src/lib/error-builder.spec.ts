import { describe, it, expect } from 'vitest';
import {
  buildErrorResponse,
  buildValidationError,
  buildUnauthorizedError,
  buildForbiddenError,
  buildNotFoundError,
  buildInsufficientFundsError,
  buildServiceUnavailableError,
  buildInternalError,
} from './error-builder';
import { ErrorTypes } from '@assetsim/shared/finance-models';

describe('Error Builder', () => {
  describe('buildErrorResponse', () => {
    it('should build a complete RFC 7807 error response', () => {
      const response = buildErrorResponse(
        400,
        'https://assetsim.com/errors/test-error',
        'Test Error',
        'This is a test error',
        '/api/test/123',
        [{ field: 'name', message: 'Required' }]
      );

      expect(response.status).toBe(400);
      expect(response.jsonBody).toEqual({
        type: 'https://assetsim.com/errors/test-error',
        title: 'Test Error',
        status: 400,
        detail: 'This is a test error',
        instance: '/api/test/123',
        errors: [{ field: 'name', message: 'Required' }],
      });
    });

    it('should build error response without optional fields', () => {
      const response = buildErrorResponse(
        500,
        'https://assetsim.com/errors/internal',
        'Internal Error',
        'Something went wrong'
      );

      expect(response.status).toBe(500);
      expect(response.jsonBody).toEqual({
        type: 'https://assetsim.com/errors/internal',
        title: 'Internal Error',
        status: 500,
        detail: 'Something went wrong',
      });
    });
  });

  describe('buildValidationError', () => {
    it('should build a validation error with default message', () => {
      const response = buildValidationError();

      expect(response.status).toBe(400);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.VALIDATION_ERROR,
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid request body',
      });
    });

    it('should build a validation error with custom message and errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ];
      const response = buildValidationError('Form validation failed', errors, '/api/users');

      expect(response.status).toBe(400);
      expect(response.jsonBody).toEqual({
        type: ErrorTypes.VALIDATION_ERROR,
        title: 'Validation Error',
        status: 400,
        detail: 'Form validation failed',
        instance: '/api/users',
        errors,
      });
    });
  });

  describe('buildUnauthorizedError', () => {
    it('should build an unauthorized error with default message', () => {
      const response = buildUnauthorizedError();

      expect(response.status).toBe(401);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.UNAUTHORIZED,
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
      });
    });

    it('should build an unauthorized error with custom message', () => {
      const response = buildUnauthorizedError('Invalid token', '/api/protected');

      expect(response.status).toBe(401);
      expect(response.jsonBody).toEqual({
        type: ErrorTypes.UNAUTHORIZED,
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid token',
        instance: '/api/protected',
      });
    });
  });

  describe('buildForbiddenError', () => {
    it('should build a forbidden error', () => {
      const response = buildForbiddenError(
        'You do not have permission to access this resource',
        '/api/admin'
      );

      expect(response.status).toBe(403);
      expect(response.jsonBody).toEqual({
        type: ErrorTypes.FORBIDDEN,
        title: 'Forbidden',
        status: 403,
        detail: 'You do not have permission to access this resource',
        instance: '/api/admin',
      });
    });
  });

  describe('buildNotFoundError', () => {
    it('should build a not found error', () => {
      const response = buildNotFoundError('Resource not found', '/api/orders/123');

      expect(response.status).toBe(404);
      expect(response.jsonBody).toEqual({
        type: ErrorTypes.NOT_FOUND,
        title: 'Not Found',
        status: 404,
        detail: 'Resource not found',
        instance: '/api/orders/123',
      });
    });
  });

  describe('buildInsufficientFundsError', () => {
    it('should build an insufficient funds error', () => {
      const response = buildInsufficientFundsError(
        'Order value $50,000 exceeds buying power $10,000.',
        '/orders/123'
      );

      expect(response.status).toBe(400);
      expect(response.jsonBody).toEqual({
        type: ErrorTypes.INSUFFICIENT_FUNDS,
        title: 'Insufficient Funds',
        status: 400,
        detail: 'Order value $50,000 exceeds buying power $10,000.',
        instance: '/orders/123',
      });
    });
  });

  describe('buildServiceUnavailableError', () => {
    it('should build a service unavailable error with default message', () => {
      const response = buildServiceUnavailableError();

      expect(response.status).toBe(503);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.SERVICE_UNAVAILABLE,
        title: 'Service Unavailable',
        status: 503,
        detail: 'Service temporarily unavailable. Please try again in a moment.',
      });
    });

    it('should build a service unavailable error with custom message', () => {
      const response = buildServiceUnavailableError(
        'Database connection error',
        '/api/orders'
      );

      expect(response.status).toBe(503);
      expect(response.jsonBody).toEqual({
        type: ErrorTypes.SERVICE_UNAVAILABLE,
        title: 'Service Unavailable',
        status: 503,
        detail: 'Database connection error',
        instance: '/api/orders',
      });
    });
  });

  describe('buildInternalError', () => {
    it('should build an internal error with default message', () => {
      const response = buildInternalError();

      expect(response.status).toBe(500);
      expect(response.jsonBody).toMatchObject({
        type: ErrorTypes.INTERNAL_ERROR,
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred. Please try again or contact support if the issue persists.',
      });
    });

    it('should build an internal error with custom message', () => {
      const response = buildInternalError('Unexpected database error', '/api/orders');

      expect(response.status).toBe(500);
      expect(response.jsonBody).toEqual({
        type: ErrorTypes.INTERNAL_ERROR,
        title: 'Internal Server Error',
        status: 500,
        detail: 'Unexpected database error',
        instance: '/api/orders',
      });
    });
  });
});
