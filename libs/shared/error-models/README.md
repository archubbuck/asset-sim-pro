# @assetsim/shared/error-models

Standardized error response models following [RFC 7807 Problem Details for HTTP APIs](https://tools.ietf.org/html/rfc7807) for AssetSim Pro.

## Purpose

This library provides a centralized set of error definitions and TypeScript types used across both backend and frontend applications in AssetSim Pro. It ensures consistent, structured error responses that make it easier to:

- **Communicate errors clearly** between backend and frontend
- **Surface structured information** to users and developers
- **Follow industry standards** (RFC 7807) for HTTP API error responses
- **Maintain consistency** across all AssetSim Pro services

The library implements **ADR-018: Standardized Error Handling** for the AssetSim Pro platform.

## Installation

This is an internal library within the AssetSim Pro monorepo. It's automatically available to other workspace projects:

```typescript
import {
  ProblemDetails,
  ValidationProblemDetails,
  ValidationError,
  ErrorTypes,
  ErrorTitles,
} from '@assetsim/shared/error-models';
```

## Main Types & Exports

### `ProblemDetails`

The core RFC 7807-compliant error response interface. All error responses in AssetSim Pro conform to this structure.

```typescript
export interface ProblemDetails {
  /** URI identifying the problem type (e.g., "https://assetsim.com/errors/not-found") */
  type: string;

  /** Short, human-readable summary (e.g., "Not Found") */
  title: string;

  /** HTTP status code (e.g., 404) */
  status: number;

  /** Human-readable explanation specific to this occurrence */
  detail: string;

  /** Optional URI identifying the specific occurrence (e.g., "/api/v1/exchanges/123") */
  instance?: string;

  /** Additional extensibility fields */
  [key: string]: unknown;
}
```

**[View Source](./src/lib/problem-details.ts#L12-L49)**

### `ValidationError`

Represents a single field-level validation error, used in validation problem details.

```typescript
export interface ValidationError {
  /** Error code (e.g., "invalid_type", "too_small") */
  code: string;

  /** Human-readable error message */
  message: string;

  /** JSON path to the field with the error (e.g., ["orders", 0, "quantity"]) */
  path: (string | number)[];
}
```

**[View Source](./src/lib/problem-details.ts#L54-L58)**

### `ValidationProblemDetails`

Extended `ProblemDetails` interface that includes an array of field-level validation errors. Used for 400 Bad Request responses.

```typescript
export interface ValidationProblemDetails extends ProblemDetails {
  errors: ValidationError[];
}
```

**[View Source](./src/lib/problem-details.ts#L63-L65)**

### `ErrorTypes`

Constant object containing standardized error type URIs used throughout AssetSim Pro.

```typescript
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
```

**[View Source](./src/lib/problem-details.ts#L70-L79)**

### `ErrorTitles`

Constant object containing human-readable titles corresponding to each error type.

```typescript
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
```

**[View Source](./src/lib/problem-details.ts#L84-L93)**

## Usage Examples

### Backend (Azure Functions)

The backend uses utility functions in `error-handler.ts` to generate RFC 7807-compliant error responses:

```typescript
import {
  ProblemDetails,
  ValidationProblemDetails,
  ErrorTypes,
  ErrorTitles,
} from '@assetsim/shared/error-models';
import {
  createNotFoundResponse,
  createValidationErrorResponse,
} from './error-handler';

// Not Found Error
export async function getExchange(id: string) {
  const exchange = await db.getExchange(id);

  if (!exchange) {
    return createNotFoundResponse(
      'Exchange not found',
      `/api/v1/exchanges/${id}`,
    );
  }

  return { status: 200, jsonBody: exchange };
}

// Validation Error (using Zod)
export async function createOrder(body: unknown) {
  const result = OrderSchema.safeParse(body);

  if (!result.success) {
    return createValidationErrorResponse(result.error, '/api/v1/orders');
  }

  // Process valid order...
}
```

**[See Full Backend Implementation](../../apps/backend/src/lib/error-handler.ts)**

### Frontend (Angular)

The frontend error interceptor automatically parses RFC 7807 Problem Details responses and displays user-friendly notifications:

```typescript
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ProblemDetails } from '../models/problem-details';
import { ErrorNotificationService } from './error-notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorNotificationService = inject(ErrorNotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Parse RFC 7807 Problem Details
      if (
        error.error &&
        typeof error.error === 'object' &&
        'type' in error.error &&
        'title' in error.error
      ) {
        const problemDetails = error.error as ProblemDetails;

        // Display notification to user
        errorNotificationService.showError(
          problemDetails.title,
          problemDetails.detail,
        );

        return throwError(() => problemDetails);
      }

      // Fallback for non-RFC 7807 errors
      // ...
    }),
  );
};
```

**[See Full Frontend Implementation](../../libs/client/core/src/lib/error-handling/error.interceptor.ts)**

## Sample Error Responses

### Not Found (404)

```json
{
  "type": "https://assetsim.com/errors/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Exchange not found",
  "instance": "/api/v1/exchanges/123"
}
```

### Validation Error (400)

```json
{
  "type": "https://assetsim.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Invalid request body",
  "instance": "/api/v1/orders",
  "errors": [
    {
      "code": "invalid_type",
      "message": "Expected number, received string",
      "path": ["quantity"]
    },
    {
      "code": "too_small",
      "message": "Number must be greater than or equal to 0",
      "path": ["price"]
    }
  ]
}
```

### Insufficient Funds (400)

```json
{
  "type": "https://assetsim.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 400,
  "detail": "Order value $50,000 exceeds buying power $10,000",
  "instance": "/api/v1/orders/456"
}
```

### Unauthorized (401)

```json
{
  "type": "https://assetsim.com/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Authentication required",
  "instance": "/api/v1/portfolios"
}
```

### Service Unavailable (503)

```json
{
  "type": "https://assetsim.com/errors/service-unavailable",
  "title": "Service Unavailable",
  "status": 503,
  "detail": "Database connection error. Please try again in a moment.",
  "instance": "/api/v1/market-data"
}
```

## Integration Points

### Backend

- **Error Handler Utilities**: `apps/backend/src/lib/error-handler.ts` provides functions to generate RFC 7807 responses
- **Azure Functions**: All HTTP-triggered functions use these utilities for consistent error responses
- **Database Error Mapping**: SQL Server errors are mapped to appropriate Problem Details responses
- **Zod Validation**: Validation errors from Zod schemas are automatically converted to `ValidationProblemDetails`

### Frontend

- **HTTP Interceptor**: `libs/client/core/src/lib/error-handling/error.interceptor.ts` parses Problem Details responses
- **Error Notification Service**: Displays user-friendly error messages based on Problem Details
- **Type Safety**: Shared types ensure frontend and backend stay synchronized

## Related Documentation

- [BACKEND_FRONTEND_INTEGRATION.md - Integration Point 2](../../docs/architecture/BACKEND_FRONTEND_INTEGRATION.md)
- [RFC 7807 Specification](https://tools.ietf.org/html/rfc7807)

## Code References

- **Library Source**: [libs/shared/error-models/src/lib/problem-details.ts](./src/lib/problem-details.ts)
- **Backend Integration**: [apps/backend/src/lib/error-handler.ts](../../apps/backend/src/lib/error-handler.ts)
- **Frontend Integration**: [libs/client/core/src/lib/error-handling/error.interceptor.ts](../../libs/client/core/src/lib/error-handling/error.interceptor.ts)
- **Frontend Models**: [libs/client/core/src/lib/models/problem-details.ts](../../libs/client/core/src/lib/models/problem-details.ts) _(local copy for build compatibility)_

## Development

This library is part of the AssetSim Pro Nx monorepo. To build or test:

```bash
# Build the library
npx nx build shared-error-models

# Run tests (if available)
npx nx test shared-error-models

# Lint
npx nx lint shared-error-models
```

## Contributing

When adding new error types:

1. Add the error type URI to `ErrorTypes` constant
2. Add the corresponding title to `ErrorTitles` constant
3. Consider adding a utility function in `apps/backend/src/lib/error-handler.ts` for common use cases
4. Update this README with examples
5. Ensure both backend and frontend handle the new error type appropriately

---

**Maintained by**: AssetSim Pro Engineering Team  
**License**: Proprietary
