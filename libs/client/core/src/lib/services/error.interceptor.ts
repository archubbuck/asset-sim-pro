import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorNotificationService } from './error-notification.service';

/**
 * RFC 7807 Problem Details interface
 * Matches the backend error response format
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  [key: string]: unknown;
}

/**
 * HTTP Error Interceptor
 * 
 * Intercepts HTTP errors and parses RFC 7807 Problem Details responses
 * Implements ADR-018: Standardized Error Handling
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorNotificationService = inject(ErrorNotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Check if the error response is RFC 7807 Problem Details
      if (
        error.error &&
        typeof error.error === 'object' &&
        'type' in error.error &&
        'title' in error.error &&
        'status' in error.error &&
        'detail' in error.error
      ) {
        const problemDetails = error.error as ProblemDetails;
        
        // Display user-friendly error notification
        errorNotificationService.showError(
          problemDetails.title,
          problemDetails.detail
        );
        
        // Return the problem details for further handling
        return throwError(() => problemDetails);
      }

      // Handle non-RFC 7807 errors (fallback)
      const errorMessage = error.error?.message || error.message || 'An unexpected error occurred';
      
      errorNotificationService.showError(
        `Error ${error.status}`,
        errorMessage
      );

      return throwError(() => error);
    })
  );
};
