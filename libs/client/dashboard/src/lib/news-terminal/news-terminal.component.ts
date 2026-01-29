/**
 * NewsTerminalComponent Widget
 * Displays financial news feed
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-news-terminal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="widget">
      <h3 class="widget-title">News Terminal</h3>
      <p class="widget-content">Bloomberg Feed: Fed Rate Decision</p>
      <p class="widget-subtitle">Latest financial news and updates</p>
    </div>
  `,
  styles: [`
    .widget {
      padding: 1rem;
      background-color: #334155;
      border-radius: 0.25rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    .widget-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .widget-content {
      font-size: 0.875rem;
      color: #d1d5db;
    }
    .widget-subtitle {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 0.5rem;
    }
  `]
})
export class NewsTerminalComponent {}
