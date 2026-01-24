/**
 * FinancialChartComponent
 * 
 * Displays candlestick and volume charts using Kendo Charts
 * Shows OHLC (Open-High-Low-Close) price data with volume bars
 * 
 * Features:
 * - Kendo Chart for financial visualization
 * - Candlestick series for price movements
 * - Column series for volume data
 * - Real-time price updates from SignalR
 * - Historical data simulation
 */
import { Component, inject, signal, OnInit, OnDestroy, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartsModule } from '@progress/kendo-angular-charts';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { SignalRService } from '@assetsim/client/core';
import Decimal from 'decimal.js';

/**
 * OHLC data point interface
 */
interface OHLCData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Component({
  selector: 'app-financial-chart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartsModule,
    DropDownsModule,
    ButtonsModule
  ],
  template: `
    <div class="widget financial-chart">
      <div class="widget-header">
        <h3 class="widget-title">Financial Chart</h3>
        <div class="widget-controls">
          <kendo-dropdownlist
            [value]="selectedSymbol()"
            (valueChange)="selectedSymbol.set($event); onSymbolChange()"
            [data]="symbolOptions"
            [style.width.px]="150">
          </kendo-dropdownlist>
          <button
            kendoButton
            themeColor="primary"
            [icon]="'refresh'"
            (click)="refreshData()">
            Refresh
          </button>
        </div>
      </div>

      @if (isLoading()) {
        <div class="loading-state">Loading chart data...</div>
      } @else if (errorMessage()) {
        <div class="error-state">{{ errorMessage() }}</div>
      } @else {
        <!-- Price Chart (Candlestick) -->
        <div class="chart-container">
          <kendo-chart [style.height.px]="300">
            <kendo-chart-title text="{{ selectedSymbol() }} Price"></kendo-chart-title>
            
            <kendo-chart-series>
              <kendo-chart-series-item
                type="candlestick"
                [data]="chartData()"
                openField="open"
                highField="high"
                lowField="low"
                closeField="close"
                categoryField="date"
                [downColor]="'#ef4444'"
                [color]="'#10b981'">
              </kendo-chart-series-item>
            </kendo-chart-series>

            <kendo-chart-category-axis>
              <kendo-chart-category-axis-item
                [baseUnit]="'minutes'"
                [labels]="{ format: 'HH:mm' }">
              </kendo-chart-category-axis-item>
            </kendo-chart-category-axis>

            <kendo-chart-value-axis>
              <kendo-chart-value-axis-item
                [labels]="{ format: 'c2' }">
              </kendo-chart-value-axis-item>
            </kendo-chart-value-axis>

            <kendo-chart-tooltip>
              <ng-template kendoChartSeriesTooltipTemplate let-dataItem="dataItem">
                <div class="tooltip-content">
                  <div><strong>{{ selectedSymbol() }}</strong></div>
                  <div>Open: {{ dataItem.open | currency }}</div>
                  <div>High: {{ dataItem.high | currency }}</div>
                  <div>Low: {{ dataItem.low | currency }}</div>
                  <div>Close: {{ dataItem.close | currency }}</div>
                  <div>Time: {{ dataItem.date | date:'short' }}</div>
                </div>
              </ng-template>
            </kendo-chart-tooltip>
          </kendo-chart>
        </div>

        <!-- Volume Chart -->
        <div class="chart-container">
          <kendo-chart [style.height.px]="150">
            <kendo-chart-title text="Volume"></kendo-chart-title>
            
            <kendo-chart-series>
              <kendo-chart-series-item
                type="column"
                [data]="chartData()"
                field="volume"
                categoryField="date"
                [color]="'#6366f1'">
              </kendo-chart-series-item>
            </kendo-chart-series>

            <kendo-chart-category-axis>
              <kendo-chart-category-axis-item
                [baseUnit]="'minutes'"
                [labels]="{ format: 'HH:mm' }">
              </kendo-chart-category-axis-item>
            </kendo-chart-category-axis>

            <kendo-chart-value-axis>
              <kendo-chart-value-axis-item
                [labels]="{ format: 'n0' }">
              </kendo-chart-value-axis-item>
            </kendo-chart-value-axis>

            <kendo-chart-tooltip>
              <ng-template kendoChartSeriesTooltipTemplate let-dataItem="dataItem">
                <div class="tooltip-content">
                  <div>Volume: {{ dataItem.volume | number }}</div>
                  <div>Time: {{ dataItem.date | date:'short' }}</div>
                </div>
              </ng-template>
            </kendo-chart-tooltip>
          </kendo-chart>
        </div>

        <!-- Real-time Price Display -->
        @if (latestPrice() !== null) {
          <div class="price-ticker">
            <span class="ticker-label">Last Price:</span>
            <span class="ticker-price" [class.up]="priceChange() > 0" [class.down]="priceChange() < 0">
              {{ latestPrice() | currency }}
            </span>
            <span class="ticker-change" [class.up]="priceChange() > 0" [class.down]="priceChange() < 0">
              {{ priceChange() > 0 ? '+' : '' }}{{ priceChange() | number:'1.2-2' }}%
            </span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .widget {
      padding: 1rem;
      background-color: #334155;
      border-radius: 0.25rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    
    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .widget-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #cbd5e1;
      margin: 0;
    }
    
    .widget-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    
    .chart-container {
      margin-bottom: 1.5rem;
      background-color: #1e293b;
      padding: 1rem;
      border-radius: 0.25rem;
    }
    
    .loading-state,
    .error-state {
      padding: 2rem;
      text-align: center;
      color: #d1d5db;
    }
    
    .error-state {
      color: #f87171;
    }

    .price-ticker {
      display: flex;
      gap: 1rem;
      align-items: center;
      padding: 1rem;
      background-color: #1e293b;
      border-radius: 0.25rem;
      font-family: monospace;
    }

    .ticker-label {
      color: #9ca3af;
      font-size: 0.875rem;
    }

    .ticker-price {
      font-size: 1.5rem;
      font-weight: 600;
      color: #cbd5e1;
    }

    .ticker-price.up {
      color: #10b981;
    }

    .ticker-price.down {
      color: #ef4444;
    }

    .ticker-change {
      font-size: 1rem;
      font-weight: 600;
    }

    .ticker-change.up {
      color: #10b981;
    }

    .ticker-change.down {
      color: #ef4444;
    }

    .tooltip-content {
      padding: 0.5rem;
    }

    .tooltip-content div {
      margin-bottom: 0.25rem;
    }

    /* Kendo Chart styling overrides */
    :host .k-chart {
      color: #cbd5e1;
    }

    :host .k-chart-title {
      color: #cbd5e1;
    }

    :host .k-chart-axis-labels {
      color: #9ca3af;
    }
  `]
})
export class FinancialChartComponent implements OnInit, OnDestroy {
  private signalRService = inject(SignalRService);

  // Symbol selection - made signal for reactivity
  selectedSymbol = signal('AAPL');
  symbolOptions = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'];

  // Chart data
  chartData = signal<OHLCData[]>([]);
  
  // Real-time price data
  latestPrice = signal<number | null>(null);
  priceChange = signal<number>(0);

  // State
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    // Setup real-time price updates using effect() instead of setInterval
    // This reacts to changes in latestPrices signal from SignalR
    effect(() => {
      const prices = this.signalRService.latestPrices();
      const symbol = this.selectedSymbol(); // Read signal so effect tracks it
      const priceData = prices.get(symbol);
      
      if (priceData) {
        // Use untracked to read previous price without making it a dependency
        const previousPrice = untracked(() => this.latestPrice());
        this.latestPrice.set(priceData.price);
        this.priceChange.set(priceData.changePercent);

        // Update chart with new candle if price changed significantly
        if (previousPrice && Math.abs(priceData.price - previousPrice) > 0.01) {
          this.updateChartWithNewPrice(priceData.price);
        }
      }
    });
  }

  ngOnInit(): void {
    this.loadChartData();
  }

  ngOnDestroy(): void {
    // No cleanup needed - effect is automatically cleaned up
  }

  /**
   * Load historical chart data
   */
  loadChartData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      // Generate stub OHLC data for demonstration
      // In a real implementation, this would come from a historical data API
      const data = this.generateStubOHLCData(this.selectedSymbol(), 30);
      this.chartData.set(data);

      // Set initial price
      if (data.length > 0) {
        this.latestPrice.set(data[data.length - 1].close);
      }
    } catch (error) {
      this.errorMessage.set(`Failed to load chart data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Generate stub OHLC data for demonstration
   * Uses Decimal.js for precise financial calculations per ADR-006
   */
  generateStubOHLCData(symbol: string, periods: number): OHLCData[] {
    const data: OHLCData[] = [];
    const now = new Date();
    
    // Base prices for different symbols
    const basePrices: Record<string, number> = {
      'AAPL': 178.50,
      'MSFT': 380.00,
      'GOOGL': 142.00,
      'TSLA': 245.00,
      'AMZN': 165.00
    };

    let basePrice = new Decimal(basePrices[symbol] || 100);

    for (let i = periods; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 5 * 60 * 1000); // 5-minute intervals
      
      // Simulate price movement with Decimal for precision
      const volatility = new Decimal(0.02); // 2% volatility
      const randomFactor = new Decimal(Math.random() - 0.5);
      const change = randomFactor.times(volatility).times(basePrice);
      basePrice = basePrice.plus(change);

      const open = basePrice;
      const closeRandom = new Decimal(Math.random() - 0.5);
      const close = basePrice.plus(closeRandom.times(volatility).times(basePrice));
      
      // Calculate high/low with precision
      const highRandom = new Decimal(Math.random()).times(volatility).times(basePrice).times(0.5);
      const lowRandom = new Decimal(Math.random()).times(volatility).times(basePrice).times(0.5);
      
      const openNum = open.toNumber();
      const closeNum = close.toNumber();
      const high = Math.max(openNum, closeNum) + highRandom.toNumber();
      const low = Math.min(openNum, closeNum) - lowRandom.toNumber();
      
      const volume = Math.floor(Math.random() * 1000000) + 500000;

      data.push({
        date,
        open: Math.max(0.01, openNum),
        high: Math.max(0.01, high),
        low: Math.max(0.01, low),
        close: Math.max(0.01, closeNum),
        volume
      });
    }

    return data;
  }

  /**
   * Update chart with new price data
   */
  updateChartWithNewPrice(newPrice: number): void {
    const currentData = this.chartData();
    if (currentData.length === 0) return;

    const lastCandle = currentData[currentData.length - 1];
    const now = new Date();

    // If last candle is older than 5 minutes, create a new one
    if (now.getTime() - lastCandle.date.getTime() > 5 * 60 * 1000) {
      const newCandle: OHLCData = {
        date: now,
        open: lastCandle.close,
        high: Math.max(lastCandle.close, newPrice),
        low: Math.min(lastCandle.close, newPrice),
        close: newPrice,
        volume: Math.floor(Math.random() * 1000000) + 500000
      };

      // Keep last 30 candles
      const updatedData = [...currentData.slice(-29), newCandle];
      this.chartData.set(updatedData);
    } else {
      // Update the current candle
      const updatedLastCandle = {
        ...lastCandle,
        high: Math.max(lastCandle.high, newPrice),
        low: Math.min(lastCandle.low, newPrice),
        close: newPrice
      };

      const updatedData = [...currentData.slice(0, -1), updatedLastCandle];
      this.chartData.set(updatedData);
    }
  }

  /**
   * Handle symbol change
   * Reloads chart data and synchronizes real-time ticker with new symbol
   */
  onSymbolChange(): void {
    // Reload historical/chart data for the newly selected symbol
    this.loadChartData();

    // Immediately synchronize the real-time ticker with the selected symbol
    // so we don't show the previous symbol's last price until the next SignalR tick.
    const prices = this.signalRService.latestPrices();
    const priceData = prices.get(this.selectedSymbol());
    
    if (priceData) {
      this.latestPrice.set(priceData.price);
      this.priceChange.set(priceData.changePercent);
      this.updateChartWithNewPrice(priceData.price);
    }
  }

  /**
   * Refresh chart data
   */
  refreshData(): void {
    this.loadChartData();
  }
}
