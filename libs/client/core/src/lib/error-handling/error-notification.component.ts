import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorNotificationService } from './error-notification.service';

/**
 * Error Notification Component
 * 
 * Displays error notifications using custom styling
 * Implements ADR-018: Standardized Error Handling
 */
@Component({
  selector: 'core-error-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-notifications-container">
      @for (error of errorService.errors(); track error.id) {
        <div class="error-notification" role="alert">
          <div class="error-header">
            <h4 class="error-title">{{ error.title }}</h4>
            <button 
              class="error-close" 
              (click)="errorService.dismissError(error.id)"
              aria-label="Close notification">
              ×
            </button>
          </div>
          <p class="error-message">{{ error.message }}</p>
          <small class="error-time">{{ formatTime(error.timestamp) }}</small>
        </div>
      }
    </div>
  `,
  styles: [`
    .error-notifications-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 420px;
    }

    .error-notification {
      background: #fff;
      border-left: 4px solid #dc3545;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 16px;
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

    .error-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .error-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #dc3545;
      flex: 1;
    }

    .error-close {
      background: none;
      border: none;
      font-size: 24px;
      line-height: 1;
      color: #999;
      cursor: pointer;
      padding: 0;
      margin-left: 12px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .error-close:hover {
      background: #f5f5f5;
      color: #333;
    }

    .error-message {
      margin: 0 0 8px 0;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }

    .error-time {
      color: #999;
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
