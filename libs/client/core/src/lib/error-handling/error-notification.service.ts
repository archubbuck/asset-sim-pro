import { Injectable, signal, DestroyRef, inject } from '@angular/core';
import { timer, Subscription } from 'rxjs';
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
  
  // Map to store timer subscriptions for proper cleanup
  private readonly timerSubscriptions = new Map<string, Subscription>();

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
    const subscription = timer(10000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.dismissError(error.id);
      });
    
    // Store subscription for cleanup when manually dismissed
    this.timerSubscriptions.set(error.id, subscription);
  }

  /**
   * Dismiss an error notification by ID
   */
  dismissError(id: string): void {
    this._errors.update((errors) => errors.filter((e) => e.id !== id));
    
    // Unsubscribe and remove timer subscription for this error
    const subscription = this.timerSubscriptions.get(id);
    if (subscription) {
      subscription.unsubscribe();
      this.timerSubscriptions.delete(id);
    }
  }

  /**
   * Clear all error notifications
   */
  clearAll(): void {
    this._errors.set([]);
    
    // Unsubscribe from all timer subscriptions
    this.timerSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.timerSubscriptions.clear();
  }
}
