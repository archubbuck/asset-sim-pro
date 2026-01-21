import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from '@progress/kendo-angular-dialog';
import { ButtonModule } from '@progress/kendo-angular-buttons';
import { ErrorNotificationService } from '../services/error-notification.service';

/**
 * Error Notification Component
 * 
 * Displays error notifications using Kendo UI Dialog component
 * Implements ADR-018: Standardized Error Handling
 * Uses Kendo UI as per ADR-006
 */
@Component({
  selector: 'app-error-notification',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule],
  template: `
    @for (error of errorService.errors(); track error.id) {
      <kendo-dialog
        [title]="error.title"
        (close)="errorService.dismissError(error.id)"
        [minWidth]="250"
        [width]="400"
        class="error-dialog">
        <div class="error-content">
          <p class="error-message">{{ error.message }}</p>
          <small class="error-time">{{ formatTime(error.timestamp) }}</small>
        </div>
        <kendo-dialog-actions>
          <button kendoButton (click)="errorService.dismissError(error.id)">
            Dismiss
          </button>
        </kendo-dialog-actions>
      </kendo-dialog>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .error-dialog {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .error-content {
      padding: 8px 0;
    }

    .error-message {
      margin: 0 0 12px 0;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }

    .error-time {
      color: rgba(0, 0, 0, 0.5);
      font-size: 12px;
    }
  `],
})
export class ErrorNotificationComponent {
  readonly errorService = inject(ErrorNotificationService);

  formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString();
  }
}
