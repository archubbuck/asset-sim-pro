/**
 * RiskMatrixComponent Widget
 * Displays portfolio risk metrics including VaR
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-risk-matrix',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="widget">
      <h3 class="widget-title">Risk Matrix</h3>
      <p class="widget-content">Portfolio VaR: <span class="var-value">1.2%</span></p>
      <p class="widget-subtitle">Value at Risk (95% confidence)</p>
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
    .var-value {
      color: #fbbf24;
      font-family: monospace;
    }
    .widget-subtitle {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 0.5rem;
    }
  `]
})
export class RiskMatrixComponent {}
