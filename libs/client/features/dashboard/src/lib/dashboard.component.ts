/**
 * DashboardComponent
 * 
 * Implements ADR-022: Dynamic Dashboard Component
 * Displays customizable trading desk widgets based on feature flag configuration
 * 
 * Features:
 * - Dynamic widget layout controlled by FeatureService
 * - Market Depth widget for L2 order book visualization
 * - Risk Matrix widget for portfolio VaR display
 * - News Terminal widget for financial news feed
 * - Responsive grid layout
 * - Signal-based reactive state management
 */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureService } from '@assetsim/client/core';

/**
 * MarketDepthComponent Widget
 * Displays Level 2 market depth (order book)
 */
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

/**
 * RiskMatrixComponent Widget
 * Displays portfolio risk metrics including VaR
 */
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

/**
 * NewsTerminalComponent Widget
 * Displays financial news feed
 */
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

/**
 * DashboardComponent
 * Main dashboard container with dynamic widget rendering
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MarketDepthComponent, RiskMatrixComponent, NewsTerminalComponent],
  template: `
    <h2 class="dashboard-title">Trading Desk: {{ deskName() }}</h2>
      
    <div class="dashboard-grid">
      @for (widgetId of layout(); track widgetId) {
        @switch (widgetId) {
          @case ('market-depth') { <app-market-depth class="grid-item" /> }
          @case ('risk-matrix') { <app-risk-matrix class="grid-item-wide" /> }
          @case ('news-terminal') { <app-news-terminal class="grid-item" /> }
          @default { <div class="placeholder-widget">Widget: {{widgetId}}</div> }
        }
      }
    </div>
  `,
  styles: [`
    .dashboard-title {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      font-weight: bold;
      color: #cbd5e1;
    }
    
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    @media (min-width: 768px) {
      .dashboard-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .grid-item-wide {
        grid-column: span 2;
      }
    }
    
    @media (min-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: repeat(3, 1fr);
      }
      
      .grid-item-wide {
        grid-column: span 2;
      }
    }
    
    .placeholder-widget {
      padding: 1rem;
      border: 2px dashed #475569;
    }
  `]
})
export class DashboardComponent {
  private featureService = inject(FeatureService);
  public deskName = signal("Alpha Strategy Fund I");
  public layout = signal(this.featureService.config().dashboardLayout);
}
