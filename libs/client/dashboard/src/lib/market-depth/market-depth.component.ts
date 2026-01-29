/**
 * MarketDepthComponent Widget
 * Displays Level 2 market depth (order book)
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-market-depth',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="widget">
      <h3 class="widget-title">L2 Market Depth</h3>
      <p class="widget-content">Real-time order book visualization</p>
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
  `]
})
export class MarketDepthComponent {}
