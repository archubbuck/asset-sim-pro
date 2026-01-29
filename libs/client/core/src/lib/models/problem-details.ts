/**
 * RFC 7807 Problem Details for HTTP APIs
 * https://tools.ietf.org/html/rfc7807
 * 
 * Standardized error response format for AssetSim Pro
 * Implements ADR-018: Standardized Error Handling
 * 
 * Note: This is a local copy to avoid cross-library dependencies during ng-packagr compilation.
 * The canonical definition is in @assetsim/shared/error-models
 * 
 * TODO: Consolidate with @assetsim/shared/error-models when ng-packagr cross-library 
 * dependency resolution is improved or when migrating to a different build system.
 * Last synchronized: 2026-01-23 (commit 7651b7f)
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
