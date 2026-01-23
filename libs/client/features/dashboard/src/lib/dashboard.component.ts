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
 * - Responsive grid layout with Tailwind CSS
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
    <div class="p-4 bg-slate-700 rounded shadow">
      <h3 class="text-lg font-semibold mb-2">L2 Market Depth</h3>
      <p class="text-sm text-gray-300">Real-time order book visualization</p>
    </div>
  `
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
    <div class="p-4 bg-slate-700 rounded shadow">
      <h3 class="text-lg font-semibold mb-2">Risk Matrix</h3>
      <p class="text-sm text-gray-300">Portfolio VaR: <span class="text-yellow-400 font-mono">1.2%</span></p>
      <p class="text-xs text-gray-400 mt-2">Value at Risk (95% confidence)</p>
    </div>
  `
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
    <div class="p-4 bg-slate-700 rounded shadow">
      <h3 class="text-lg font-semibold mb-2">News Terminal</h3>
      <p class="text-sm text-gray-300">Bloomberg Feed: Fed Rate Decision</p>
      <p class="text-xs text-gray-400 mt-2">Latest financial news and updates</p>
    </div>
  `
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
    <h2 class="text-xl mb-4 font-bold text-slate-300">Trading Desk: {{ deskName() }}</h2>
      
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (widgetId of layout(); track widgetId) {
        @switch (widgetId) {
          @case ('market-depth') { <app-market-depth class="col-span-1" /> }
          @case ('risk-matrix') { <app-risk-matrix class="col-span-1 md:col-span-2" /> }
          @case ('news-terminal') { <app-news-terminal class="col-span-1" /> }
          @default { <div class="p-4 border border-dashed border-slate-600">Widget: {{widgetId}}</div> }
        }
      }
    </div>
  `
})
export class DashboardComponent {
  private featureService = inject(FeatureService);
  public deskName = signal("Alpha Strategy Fund I");
  public layout = signal(this.featureService.config().dashboardLayout);
}
