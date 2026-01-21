import { HttpResponseInit } from '@azure/functions';
import { ProblemDetails, ErrorTypes } from '../types/problem-details';

/**
 * Error Response Builder for RFC 7807 Problem Details
 * Implements ADR-018: Standardized Error Handling
 * 
 * Provides a consistent way to build error responses across all Azure Functions
 */

/**
 * Build a standardized RFC 7807 error response
 */
export function buildErrorResponse(
  status: number,
  type: string,
  title: string,
  detail: string,
  instance?: string,
  errors?: unknown[]
): HttpResponseInit {
  const problemDetails: ProblemDetails = {
    type,
    title,
    status,
    detail,
  };

  if (instance) {
    problemDetails.instance = instance;
  }

  if (errors && errors.length > 0) {
    problemDetails.errors = errors;
  }

  return {
    status,
    jsonBody: problemDetails,
  };
}

/**
 * Build a validation error response (400)
 */
export function buildValidationError(
  detail: string = 'Invalid request body',
  errors?: unknown[],
  instance?: string
): HttpResponseInit {
  return buildErrorResponse(
    400,
    ErrorTypes.VALIDATION_ERROR,
    'Validation Error',
    detail,
    instance,
    errors
  );
}

/**
 * Build an unauthorized error response (401)
 */
export function buildUnauthorizedError(
  detail: string = 'Authentication required',
  instance?: string
): HttpResponseInit {
  return buildErrorResponse(
    401,
    ErrorTypes.UNAUTHORIZED,
    'Unauthorized',
    detail,
    instance
  );
}

/**
 * Build a forbidden error response (403)
 */
export function buildForbiddenError(
  detail: string,
  instance?: string
): HttpResponseInit {
  return buildErrorResponse(
    403,
    ErrorTypes.FORBIDDEN,
    'Forbidden',
    detail,
    instance
  );
}

/**
 * Build a not found error response (404)
 */
export function buildNotFoundError(
  detail: string,
  instance?: string
): HttpResponseInit {
  return buildErrorResponse(
    404,
    ErrorTypes.NOT_FOUND,
    'Not Found',
    detail,
    instance
  );
}

/**
 * Build an insufficient funds error response (400)
 */
export function buildInsufficientFundsError(
  detail: string,
  instance?: string
): HttpResponseInit {
  return buildErrorResponse(
    400,
    ErrorTypes.INSUFFICIENT_FUNDS,
    'Insufficient Funds',
    detail,
    instance
  );
}

/**
 * Build a service unavailable error response (503)
 */
export function buildServiceUnavailableError(
  detail: string = 'Service temporarily unavailable. Please try again in a moment.',
  instance?: string
): HttpResponseInit {
  return buildErrorResponse(
    503,
    ErrorTypes.SERVICE_UNAVAILABLE,
    'Service Unavailable',
    detail,
    instance
  );
}

/**
 * Build an internal server error response (500)
 */
export function buildInternalError(
  detail: string = 'An unexpected error occurred. Please try again or contact support if the issue persists.',
  instance?: string
): HttpResponseInit {
  return buildErrorResponse(
    500,
    ErrorTypes.INTERNAL_ERROR,
    'Internal Server Error',
    detail,
    instance
  );
}
