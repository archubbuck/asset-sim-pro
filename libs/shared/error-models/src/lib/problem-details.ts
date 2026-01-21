/**
 * RFC 7807 Problem Details for HTTP APIs
 * https://tools.ietf.org/html/rfc7807
 * 
 * Standardized error response format for AssetSim Pro
 * Implements ADR-018: Standardized Error Handling
 */

/**
 * RFC 7807 Problem Details object
 */
export interface ProblemDetails {
  /**
   * A URI reference that identifies the problem type.
   * Should resolve to human-readable documentation.
   * Example: "https://assetsim.com/errors/insufficient-funds"
   */
  type: string;

  /**
   * A short, human-readable summary of the problem type.
   * Should not change from occurrence to occurrence.
   * Example: "Insufficient Funds"
   */
  title: string;

  /**
   * The HTTP status code for this occurrence of the problem.
   */
  status: number;

  /**
   * A human-readable explanation specific to this occurrence.
   * Example: "Order value $50,000 exceeds buying power $10,000."
   */
  detail: string;

  /**
   * A URI reference that identifies the specific occurrence of the problem.
   * Example: "/orders/123"
   */
  instance?: string;

  /**
   * Additional members for extensibility.
   * For validation errors, this may contain an errors array.
   */
  [key: string]: unknown;
}

/**
 * Validation error detail (for 400 Bad Request responses)
 */
export interface ValidationError {
  code: string;
  message: string;
  path: (string | number)[];
}

/**
 * Extended Problem Details for validation errors
 */
export interface ValidationProblemDetails extends ProblemDetails {
  errors: ValidationError[];
}

/**
 * Standard error types used in AssetSim Pro
 */
export const ErrorTypes = {
  VALIDATION_ERROR: 'https://assetsim.com/errors/validation-error',
  UNAUTHORIZED: 'https://assetsim.com/errors/unauthorized',
  FORBIDDEN: 'https://assetsim.com/errors/forbidden',
  NOT_FOUND: 'https://assetsim.com/errors/not-found',
  CONFLICT: 'https://assetsim.com/errors/conflict',
  INSUFFICIENT_FUNDS: 'https://assetsim.com/errors/insufficient-funds',
  SERVICE_UNAVAILABLE: 'https://assetsim.com/errors/service-unavailable',
  INTERNAL_ERROR: 'https://assetsim.com/errors/internal-error',
} as const;

/**
 * Standard error titles
 */
export const ErrorTitles = {
  VALIDATION_ERROR: 'Validation Error',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not Found',
  CONFLICT: 'Conflict',
  INSUFFICIENT_FUNDS: 'Insufficient Funds',
  SERVICE_UNAVAILABLE: 'Service Unavailable',
  INTERNAL_ERROR: 'Internal Server Error',
} as const;
