import { Injectable, signal, DestroyRef, inject } from '@angular/core';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  private readonly destroyRef = inject(DestroyRef);
  
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

    // Auto-dismiss after 10 seconds using RxJS to prevent memory leaks
    timer(10000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.dismissError(error.id);
      });
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
