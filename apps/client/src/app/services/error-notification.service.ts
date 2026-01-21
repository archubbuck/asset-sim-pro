import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetails, ErrorTypes } from '@assetsim/shared/finance-models';

/**
 * Error Notification Service for user-friendly error display
 * Implements ADR-018: Standardized Error Handling
 * 
 * Provides methods to handle RFC 7807 Problem Details errors
 * and display user-friendly messages to the user
 * 
 * Note: This implementation uses console logging for now.
 * In a production implementation, this would integrate with:
 * - Kendo UI Dialog/Notification components for user alerts
 * - Application Insights for error tracking (via LoggerService)
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorNotificationService {
  /**
   * Handle RFC 7807 Problem Details error
   */
  handleError(problemDetails: ProblemDetails): void {
    // Log error details for debugging
    console.error('API Error:', problemDetails);

    // Display user-friendly message based on error type
    const userMessage = this.getUserFriendlyMessage(problemDetails);
    this.showNotification(userMessage, problemDetails.status);

    // TODO: In production, integrate with:
    // - Kendo Notification Service for toast notifications
    // - Kendo Dialog Service for critical errors requiring user action
    // - Application Insights via LoggerService for error tracking
  }

  /**
   * Handle generic HTTP errors (non-RFC 7807)
   */
  handleGenericError(error: HttpErrorResponse): void {
    console.error('HTTP Error:', error);

    const userMessage = this.getGenericErrorMessage(error.status);
    this.showNotification(userMessage, error.status);
  }

  /**
   * Get user-friendly message from RFC 7807 Problem Details
   */
  private getUserFriendlyMessage(problemDetails: ProblemDetails): string {
    // For specific error types, provide custom guidance
    switch (problemDetails.type) {
      case ErrorTypes.VALIDATION_ERROR:
        return this.formatValidationError(problemDetails);
      
      case ErrorTypes.UNAUTHORIZED:
        return 'Please sign in to continue.';
      
      case ErrorTypes.FORBIDDEN:
        return 'You do not have permission to perform this action.';
      
      case ErrorTypes.NOT_FOUND:
        return 'The requested resource was not found.';
      
      case ErrorTypes.INSUFFICIENT_FUNDS:
        return problemDetails.detail; // Use specific detail for financial errors
      
      case ErrorTypes.SERVICE_UNAVAILABLE:
        return 'The service is temporarily unavailable. Please try again in a moment.';
      
      case ErrorTypes.INTERNAL_ERROR:
        return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
      
      default:
        return problemDetails.detail || problemDetails.title;
    }
  }

  /**
   * Format validation errors with field-level details
   */
  private formatValidationError(problemDetails: ProblemDetails): string {
    let message = problemDetails.detail;

    // If validation errors array exists, format it
    if (problemDetails.errors && Array.isArray(problemDetails.errors) && problemDetails.errors.length > 0) {
      const errorList = problemDetails.errors
        .map((err: any) => {
          if (err.path && err.message) {
            return `${err.path.join('.')}: ${err.message}`;
          }
          return JSON.stringify(err);
        })
        .join(', ');
      
      message += `\n${errorList}`;
    }

    return message;
  }

  /**
   * Get generic error message for non-RFC 7807 errors
   */
  private getGenericErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Please sign in to continue.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 500:
        return 'A server error occurred. Please try again later.';
      case 503:
        return 'The service is temporarily unavailable. Please try again in a moment.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  /**
   * Show notification to the user
   * 
   * In production, this would use Kendo UI components:
   * - NotificationService for non-blocking toast messages (info, warnings)
   * - DialogService for blocking dialogs (critical errors requiring acknowledgment)
   */
  private showNotification(message: string, status: number): void {
    // For now, use console output
    // In production, use Kendo UI Notification/Dialog components
    
    if (status >= 500) {
      console.error(`[Critical Error] ${message}`);
      // TODO: Use Kendo Dialog for critical errors
    } else if (status >= 400) {
      console.warn(`[Client Error] ${message}`);
      // TODO: Use Kendo Notification for client errors
    }
  }
}
