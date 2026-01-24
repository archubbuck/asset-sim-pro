import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignalRService, ConnectionState } from '@assetsim/client/core';

/**
 * Market Ticker Component
 * 
 * Example implementation showing how to use SignalRService for real-time price updates
 * This component demonstrates:
 * - Connection to SignalR service
 * - Reactive price updates using Angular Signals
 * - Connection status monitoring
 * - Automatic cleanup (handled by SignalRService's DestroyRef)
 */
@Component({
  selector: 'app-market-ticker-example',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="market-ticker">
      <!-- Connection Status Indicator -->
      <div class="connection-status" [attr.data-state]="signalR.connectionState()">
        <span class="indicator"></span>
        <span class="text">{{ getStatusText() }}</span>
      </div>

      <!-- Price Grid -->
      <div class="price-grid">
        @if (signalR.isConnected()) {
          @for (price of signalR.latestPrices() | keyvalue; track price.key) {
            <div class="price-card" [attr.data-symbol]="price.value.symbol">
              <div class="symbol">{{ price.value.symbol }}</div>
              <div class="price">{{ price.value.price | currency }}</div>
              <div class="change" [class.positive]="price.value.change > 0" [class.negative]="price.value.change < 0">
                <span class="arrow">{{ price.value.change > 0 ? '↑' : '↓' }}</span>
                <span class="value">{{ price.value.change | number:'1.2-2' }}</span>
                <span class="percent">({{ price.value.changePercent | number:'1.2-2' }}%)</span>
              </div>
              <div class="volume">Vol: {{ price.value.volume | number }}</div>
              <div class="timestamp">{{ formatTimestamp(price.value.timestamp) }}</div>
            </div>
          } @empty {
            <div class="empty-state">Waiting for price updates...</div>
          }
        } @else {
          <div class="disconnected-state">
            <p>Not connected to market data</p>
            <button (click)="reconnect()">Reconnect</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .market-ticker {
      padding: 1rem;
      background: var(--surface-background, #1e1e1e);
      color: var(--text-primary, #ffffff);
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      margin-bottom: 1rem;
      border-radius: 4px;
      background: var(--surface-elevated, #2d2d2d);
    }

    .connection-status .indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--status-disconnected, #666);
    }

    .connection-status[data-state="Connected"] .indicator {
      background: var(--status-connected, #4caf50);
      animation: pulse 2s infinite;
    }

    .connection-status[data-state="Connecting"] .indicator,
    .connection-status[data-state="Reconnecting"] .indicator {
      background: var(--status-warning, #ff9800);
      animation: blink 1s infinite;
    }

    .connection-status[data-state="Failed"] .indicator {
      background: var(--status-error, #f44336);
    }

    .price-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
    }

    .price-card {
      padding: 1rem;
      background: var(--card-background, #2d2d2d);
      border-radius: 8px;
      border: 1px solid var(--border-color, #404040);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .price-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .price-card .symbol {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .price-card .price {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .price-card .change {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }

    .price-card .change.positive {
      color: var(--success-color, #4caf50);
    }

    .price-card .change.negative {
      color: var(--error-color, #f44336);
    }

    .price-card .volume,
    .price-card .timestamp {
      font-size: 0.75rem;
      color: var(--text-secondary, #999);
    }

    .empty-state,
    .disconnected-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary, #999);
    }

    .disconnected-state button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: var(--primary-color, #2196f3);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .disconnected-state button:hover {
      background: var(--primary-color-hover, #1976d2);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `]
})
export class MarketTickerExampleComponent implements OnInit {
  protected signalR = inject(SignalRService);

  // In a real app, this would come from auth service or route params
  private exchangeId = 'demo-exchange-id';

  async ngOnInit() {
    try {
      await this.signalR.connect(this.exchangeId);
    } catch (error) {
      console.error('Failed to connect to market data:', error);
      // In a real app, show user-friendly error message
    }
  }

  protected getStatusText(): string {
    const state = this.signalR.connectionState();
    switch (state) {
      case ConnectionState.Connected:
        return 'Live Market Data';
      case ConnectionState.Connecting:
        return 'Connecting...';
      case ConnectionState.Reconnecting:
        return 'Reconnecting...';
      case ConnectionState.Disconnected:
        return 'Disconnected';
      case ConnectionState.Failed:
        return 'Connection Failed';
      default:
        return 'Unknown';
    }
  }

  protected formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  }

  protected async reconnect() {
    try {
      await this.signalR.connect(this.exchangeId);
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  }
}
