import { Injectable, signal } from '@angular/core';

/**
 * Error notification interface
 */
export interface ErrorNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
}

/**
 * Error Notification Service
 * 
 * Manages error notifications for display in the UI
 * Uses Angular Signals for reactive state management (ADR-004)
 * Implements ADR-018: Standardized Error Handling
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorNotificationService {
  // Signal for managing error notifications
  private readonly _errors = signal<ErrorNotification[]>([]);

  /**
   * Readonly signal exposing the errors array
   */
  readonly errors = this._errors.asReadonly();

  /**
   * Show an error notification
   */
  showError(title: string, message: string): void {
    const error: ErrorNotification = {
      id: crypto.randomUUID(),
      title,
      message,
      timestamp: new Date(),
    };

    this._errors.update((errors) => [...errors, error]);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      this.dismissError(error.id);
    }, 10000);
  }

  /**
   * Dismiss an error notification by ID
   */
  dismissError(id: string): void {
    this._errors.update((errors) => errors.filter((e) => e.id !== id));
  }

  /**
   * Clear all error notifications
   */
  clearAll(): void {
    this._errors.set([]);
  }
}
