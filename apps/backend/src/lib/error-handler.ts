import { HttpResponseInit } from '@azure/functions';
import { ZodError } from 'zod';
import * as sql from 'mssql';
import {
  ProblemDetails,
  ValidationProblemDetails,
  ErrorTypes,
  ErrorTitles,
} from '@assetsim/shared/error-models';

/**
 * Error Handler Utility
 * 
 * Centralizes error handling for Azure Functions following RFC 7807 (Problem Details)
 * Implements ADR-018: Standardized Error Handling
 */

/**
 * Creates a standardized RFC 7807 Problem Details response
 */
export function createProblemDetailsResponse(
  problem: ProblemDetails
): HttpResponseInit {
  return {
    status: problem.status,
    jsonBody: problem,
    headers: {
      'Content-Type': 'application/problem+json',
    },
  };
}

/**
 * Creates a validation error response from Zod validation errors
 */
export function createValidationErrorResponse(
  zodError: ZodError,
  instance?: string
): HttpResponseInit {
  const problem: ValidationProblemDetails = {
    type: ErrorTypes.VALIDATION_ERROR,
    title: ErrorTitles.VALIDATION_ERROR,
    status: 400,
    detail: 'Invalid request body',
    instance,
    errors: zodError.issues.map((err) => ({
      code: err.code,
      message: err.message,
      path: err.path,
    })),
  };

  return createProblemDetailsResponse(problem);
}

/**
 * Creates an unauthorized error response
 */
export function createUnauthorizedResponse(
  detail: string = 'Authentication required',
  instance?: string
): HttpResponseInit {
  const problem: ProblemDetails = {
    type: ErrorTypes.UNAUTHORIZED,
    title: ErrorTitles.UNAUTHORIZED,
    status: 401,
    detail,
    instance,
  };

  return createProblemDetailsResponse(problem);
}

/**
 * Creates a forbidden error response
 */
export function createForbiddenResponse(
  detail: string,
  instance?: string
): HttpResponseInit {
  const problem: ProblemDetails = {
    type: ErrorTypes.FORBIDDEN,
    title: ErrorTitles.FORBIDDEN,
    status: 403,
    detail,
    instance,
  };

  return createProblemDetailsResponse(problem);
}

/**
 * Creates a not found error response
 */
export function createNotFoundResponse(
  detail: string,
  instance?: string
): HttpResponseInit {
  const problem: ProblemDetails = {
    type: ErrorTypes.NOT_FOUND,
    title: ErrorTitles.NOT_FOUND,
    status: 404,
    detail,
    instance,
  };

  return createProblemDetailsResponse(problem);
}

/**
 * Creates a conflict error response
 */
export function createConflictResponse(
  detail: string,
  instance?: string
): HttpResponseInit {
  const problem: ProblemDetails = {
    type: ErrorTypes.CONFLICT,
    title: ErrorTitles.CONFLICT,
    status: 409,
    detail,
    instance,
  };

  return createProblemDetailsResponse(problem);
}

/**
 * Creates an insufficient funds error response
 */
export function createInsufficientFundsResponse(
  detail: string,
  instance?: string
): HttpResponseInit {
  const problem: ProblemDetails = {
    type: ErrorTypes.INSUFFICIENT_FUNDS,
    title: ErrorTitles.INSUFFICIENT_FUNDS,
    status: 400,
    detail,
    instance,
  };

  return createProblemDetailsResponse(problem);
}

/**
 * Creates a service unavailable error response
 */
export function createServiceUnavailableResponse(
  detail: string = 'Service temporarily unavailable. Please try again later.',
  instance?: string
): HttpResponseInit {
  const problem: ProblemDetails = {
    type: ErrorTypes.SERVICE_UNAVAILABLE,
    title: ErrorTitles.SERVICE_UNAVAILABLE,
    status: 503,
    detail,
    instance,
  };

  return createProblemDetailsResponse(problem);
}

/**
 * Creates an internal server error response
 */
export function createInternalErrorResponse(
  detail: string = 'An unexpected error occurred. Please try again or contact support if the issue persists.',
  instance?: string
): HttpResponseInit {
  const problem: ProblemDetails = {
    type: ErrorTypes.INTERNAL_ERROR,
    title: ErrorTitles.INTERNAL_ERROR,
    status: 500,
    detail,
    instance,
  };

  return createProblemDetailsResponse(problem);
}

/**
 * Handles SQL Server errors and maps them to appropriate Problem Details responses
 */
export function handleSqlError(
  error: unknown,
  instance?: string
): HttpResponseInit {
  // Type guard for SQL errors
  if (
    typeof error === 'object' &&
    error !== null &&
    'number' in error &&
    'code' in error
  ) {
    const sqlError = error as sql.RequestError;

    // Connection errors (e.g., ECONNREFUSED, ETIMEOUT, login failures)
    if (
      sqlError.code === 'ECONNREFUSED' ||
      sqlError.code === 'ETIMEOUT' ||
      sqlError.code === 'ESOCKET' ||
      sqlError.number === 4060 || // Cannot open database
      sqlError.number === 18456 // Login failed
    ) {
      return createServiceUnavailableResponse(
        'Database connection error. Please try again in a moment.',
        instance
      );
    }

    // Permission errors
    if (
      sqlError.number === 229 || // SELECT permission denied
      sqlError.number === 230 || // EXECUTE permission denied
      sqlError.number === 297 // User does not have permission
    ) {
      return createForbiddenResponse(
        'You do not have permission to perform this operation.',
        instance
      );
    }

    // Foreign key constraint violations
    if (sqlError.number === 547) {
      return createProblemDetailsResponse({
        type: ErrorTypes.VALIDATION_ERROR,
        title: ErrorTitles.VALIDATION_ERROR,
        status: 400,
        detail: 'Referenced resource does not exist.',
        instance,
      });
    }
  }

  // Default to internal error for unknown SQL errors
  return createInternalErrorResponse(undefined, instance);
}

/**
 * Generic error handler that categorizes errors and returns appropriate responses
 */
export function handleError(
  error: unknown,
  instance?: string
): HttpResponseInit {
  // Authentication errors
  if (error instanceof Error && error.message.includes('Unauthorized')) {
    return createUnauthorizedResponse(error.message, instance);
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return createValidationErrorResponse(error, instance);
  }

  // SQL errors
  if (
    typeof error === 'object' &&
    error !== null &&
    'number' in error &&
    'code' in error
  ) {
    return handleSqlError(error, instance);
  }

  // Generic errors
  if (error instanceof Error) {
    return createInternalErrorResponse(
      'An unexpected error occurred. Please try again or contact support if the issue persists.',
      instance
    );
  }

  // Unknown error type
  return createInternalErrorResponse(undefined, instance);
}
