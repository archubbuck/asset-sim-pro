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
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureService } from '@assetsim/client/core';
import { MarketDepthComponent } from '../market-depth/market-depth.component';
import { RiskMatrixComponent } from '../risk-matrix/risk-matrix.component';
import { NewsTerminalComponent } from '../news-terminal/news-terminal.component';

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
  public layout = computed(() => this.featureService.config().dashboardLayout);
}
