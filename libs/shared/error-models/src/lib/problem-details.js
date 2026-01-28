"use strict";
/**
 * RFC 7807 Problem Details for HTTP APIs
 * https://tools.ietf.org/html/rfc7807
 *
 * Standardized error response format for AssetSim Pro
 * Implements ADR-018: Standardized Error Handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorTitles = exports.ErrorTypes = void 0;
/**
 * Standard error types used in AssetSim Pro
 */
exports.ErrorTypes = {
    VALIDATION_ERROR: 'https://assetsim.com/errors/validation-error',
    UNAUTHORIZED: 'https://assetsim.com/errors/unauthorized',
    FORBIDDEN: 'https://assetsim.com/errors/forbidden',
    NOT_FOUND: 'https://assetsim.com/errors/not-found',
    CONFLICT: 'https://assetsim.com/errors/conflict',
    INSUFFICIENT_FUNDS: 'https://assetsim.com/errors/insufficient-funds',
    SERVICE_UNAVAILABLE: 'https://assetsim.com/errors/service-unavailable',
    INTERNAL_ERROR: 'https://assetsim.com/errors/internal-error',
};
/**
 * Standard error titles
 */
exports.ErrorTitles = {
    VALIDATION_ERROR: 'Validation Error',
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden',
    NOT_FOUND: 'Not Found',
    CONFLICT: 'Conflict',
    INSUFFICIENT_FUNDS: 'Insufficient Funds',
    SERVICE_UNAVAILABLE: 'Service Unavailable',
    INTERNAL_ERROR: 'Internal Server Error',
};
//# sourceMappingURL=problem-details.js.map