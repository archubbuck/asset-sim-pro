# RFC 7807 Error Handling Documentation

This document describes the standardized error handling implementation in AssetSim Pro following ADR-018 and RFC 7807 (Problem Details for HTTP APIs).

## Overview

AssetSim Pro implements RFC 7807 Problem Details to provide consistent, machine-readable error responses across all API endpoints. This enables the frontend to parse errors reliably and display user-friendly messages.

## Backend Implementation

### Error Response Format

All backend errors follow the RFC 7807 structure:

```json
{
  "type": "https://assetsim.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 400,
  "detail": "Order value $50,000 exceeds buying power $10,000.",
  "instance": "/orders/123"
}
```

### Available Error Types

The following standardized error types are available:

| Type | Status Code | Use Case |
|------|------------|----------|
| `VALIDATION_ERROR` | 400 | Invalid request body or parameters |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `INSUFFICIENT_FUNDS` | 400 | Order exceeds available buying power |
| `SERVICE_UNAVAILABLE` | 503 | Database or service temporarily unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Using the Error Builder

The `error-builder.ts` utility provides helper functions to construct RFC 7807 responses:

```typescript
import {
  buildValidationError,
  buildUnauthorizedError,
  buildInsufficientFundsError,
  // ... other builders
} from '../lib/error-builder';

// In an Azure Function handler
export async function createOrder(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // ... validation logic ...
    
    if (!validationResult.success) {
      return buildValidationError(
        'Invalid request body',
        validationResult.error.errors,
        `/orders`
      );
    }
    
    // ... business logic ...
    
    if (cashBalance.lessThan(requiredCash)) {
      return buildInsufficientFundsError(
        `Insufficient cash balance. Required: ${requiredCash.toFixed(2)}, Available: ${cashBalance.toFixed(2)}`,
        `/orders/${orderId}`
      );
    }
    
    // ... success response ...
  } catch (error) {
    context.error('Error creating order:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized: No valid user principal found') {
      return buildUnauthorizedError();
    }
    
    // Handle specific SQL errors
    if (sqlError.code === 'ECONNREFUSED') {
      return buildServiceUnavailableError(
        'Database connection error. Please try again in a moment.'
      );
    }
    
    // Default to internal error
    return buildInternalError();
  }
}
```

### Error Builder API

#### `buildErrorResponse(status, type, title, detail, instance?, errors?)`
Generic error builder. Prefer using specific builders below for consistency.

#### `buildValidationError(detail?, errors?, instance?)`
- **Status**: 400
- **Use**: Invalid request body or parameters
- **Example**: `buildValidationError('Invalid email format', zodErrors, '/users')`

#### `buildUnauthorizedError(detail?, instance?)`
- **Status**: 401
- **Use**: Authentication required
- **Default detail**: "Authentication required"

#### `buildForbiddenError(detail, instance?)`
- **Status**: 403
- **Use**: User lacks permissions
- **Example**: `buildForbiddenError('You do not have permission to create orders for this portfolio.', '/orders')`

#### `buildNotFoundError(detail, instance?)`
- **Status**: 404
- **Use**: Resource not found
- **Example**: `buildNotFoundError('Portfolio not found or you do not have access to it', '/portfolios/123')`

#### `buildInsufficientFundsError(detail, instance?)`
- **Status**: 400
- **Use**: Order value exceeds available funds
- **Example**: `buildInsufficientFundsError('Order value $50,000 exceeds buying power $10,000.', '/orders/123')`

#### `buildServiceUnavailableError(detail?, instance?)`
- **Status**: 503
- **Use**: Temporary service outage (database, cache, etc.)
- **Default detail**: "Service temporarily unavailable. Please try again in a moment."

#### `buildInternalError(detail?, instance?)`
- **Status**: 500
- **Use**: Unexpected server errors
- **Default detail**: "An unexpected error occurred. Please try again or contact support if the issue persists."

## Frontend Implementation

### HTTP Error Interceptor

The `errorInterceptor` automatically intercepts all HTTP errors and parses RFC 7807 responses:

```typescript
// apps/client/src/app/app.config.ts
import { errorInterceptor } from './interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers ...
    provideHttpClient(
      withFetch(),
      withInterceptors([errorInterceptor])
    ),
  ],
};
```

The interceptor:
1. Detects RFC 7807-compliant error responses
2. Parses the problem details
3. Delegates to `ErrorNotificationService` for user-friendly display
4. Re-throws the error for component-level handling if needed

### Error Notification Service

The `ErrorNotificationService` handles displaying user-friendly error messages:

```typescript
// Automatically injected by the interceptor
// Can also be used directly in components:

import { ErrorNotificationService } from './services/error-notification.service';

@Component({...})
export class MyComponent {
  constructor(private errorService: ErrorNotificationService) {}
  
  handleCustomError() {
    const problemDetails: ProblemDetails = {
      type: ErrorTypes.VALIDATION_ERROR,
      title: 'Validation Error',
      status: 400,
      detail: 'Invalid input',
    };
    
    this.errorService.handleError(problemDetails);
  }
}
```

### User-Friendly Error Messages

The service automatically maps error types to user-friendly messages:

| Error Type | User Message |
|-----------|-------------|
| `VALIDATION_ERROR` | Shows detailed validation errors with field names |
| `UNAUTHORIZED` | "Please sign in to continue." |
| `FORBIDDEN` | "You do not have permission to perform this action." |
| `NOT_FOUND` | "The requested resource was not found." |
| `INSUFFICIENT_FUNDS` | Shows the specific detail from backend |
| `SERVICE_UNAVAILABLE` | "The service is temporarily unavailable. Please try again in a moment." |
| `INTERNAL_ERROR` | "An unexpected error occurred. Please try again or contact support if the issue persists." |

### Component-Level Error Handling

Components can still handle errors if needed:

```typescript
this.http.post('/api/orders', orderData).subscribe({
  next: (response) => {
    // Success handling
  },
  error: (error: HttpErrorResponse) => {
    // The interceptor has already logged and displayed the error
    // Additional component-specific error handling can be done here
    
    if (error.error?.type === ErrorTypes.INSUFFICIENT_FUNDS) {
      this.showBuyingPowerWarning();
    }
  }
});
```

## Testing

### Backend Tests

Test error builders using Vitest:

```typescript
import { describe, it, expect } from 'vitest';
import { buildInsufficientFundsError } from './error-builder';
import { ErrorTypes } from '../types/problem-details';

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
```

### Frontend Tests

Test error interceptor with Angular's HttpTestingController:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  it('should intercept and handle RFC 7807 error response', (done) => {
    const problemDetails: ProblemDetails = {
      type: ErrorTypes.VALIDATION_ERROR,
      title: 'Validation Error',
      status: 400,
      detail: 'Invalid request body',
    };

    httpClient.get('/api/test').subscribe({
      error: () => {
        // Error was handled by interceptor
        done();
      },
    });

    const req = httpTestingController.expectOne('/api/test');
    req.flush(problemDetails, { status: 400, statusText: 'Bad Request' });
  });
});
```

## Best Practices

1. **Always use error builders** in Azure Functions instead of manually constructing error responses
2. **Provide specific details** in error messages to help users understand and resolve issues
3. **Include instance URIs** when errors relate to specific resources
4. **Use appropriate error types** - don't use generic errors when specific ones exist
5. **Test error paths** alongside success paths in your test suites
6. **Log errors** on the backend before returning them to clients
7. **Never expose sensitive information** (e.g., stack traces, connection strings) in error details

## Future Enhancements

The error handling system is designed to be extended with:

1. **Kendo UI Notifications**: Replace console logging with Kendo Notification/Dialog components
2. **Application Insights Integration**: Automatic error tracking via LoggerService
3. **Internationalization (i18n)**: Localized error messages
4. **Error Catalog Page**: Documentation of all error types with resolution steps
5. **Retry Logic**: Automatic retry for transient errors (503, network failures)

## References

- [RFC 7807: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807)
- [ADR-018: Standardized Error Handling](../ARCHITECTURE.md#adr-018-standardized-error-handling)
- [Backend Error Builder](../apps/backend/src/lib/error-builder.ts)
- [Frontend Error Interceptor](../apps/client/src/app/interceptors/error.interceptor.ts)
- [Error Notification Service](../apps/client/src/app/services/error-notification.service.ts)
