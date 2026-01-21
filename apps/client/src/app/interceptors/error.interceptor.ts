import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorNotificationService } from '../services/error-notification.service';
import { ProblemDetails } from '@assetsim/shared/finance-models';

/**
 * HTTP Error Interceptor for RFC 7807 Problem Details
 * Implements ADR-018: Standardized Error Handling
 * 
 * Intercepts HTTP errors and parses RFC 7807 Problem Details responses
 * from the backend, then delegates to ErrorNotificationService for user-friendly display
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorNotificationService = inject(ErrorNotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        // Check if the error response contains RFC 7807 Problem Details
        const problemDetails = parseProblemDetails(error);
        
        if (problemDetails) {
          // Pass the structured error to the notification service
          errorNotificationService.handleError(problemDetails);
        } else {
          // Fallback for non-RFC 7807 errors
          errorNotificationService.handleGenericError(error);
        }
      }

      // Re-throw the error for components to handle if needed
      return throwError(() => error);
    })
  );
};

/**
 * Parse RFC 7807 Problem Details from HTTP error response
 */
function parseProblemDetails(error: HttpErrorResponse): ProblemDetails | null {
  const body = error.error;

  // Check if the error body matches RFC 7807 structure
  if (
    body &&
    typeof body === 'object' &&
    'type' in body &&
    'title' in body &&
    'status' in body &&
    'detail' in body
  ) {
    return body as ProblemDetails;
  }

  return null;
}
