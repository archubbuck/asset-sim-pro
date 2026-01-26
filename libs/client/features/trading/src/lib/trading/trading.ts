/**
 * TradingComponent
 * 
 * Implements ADR-022: Trading UI Components
 * Displays trading widgets in a dynamic layout
 * 
 * Features:
 * - Order Entry widget for placing orders
 * - Position Blotter widget for order history
 * - Financial Chart widget for price visualization
 * - Responsive grid layout
 * - Signal-based reactive state management
 */
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignalRService, LoggerService } from '@assetsim/client/core';
import { OrderEntryComponent } from '../order-entry/order-entry.component';
import { PositionBlotterComponent } from '../position-blotter/position-blotter.component';
import { FinancialChartComponent } from '../financial-chart/financial-chart.component';
import { TRADING_STUB_CONFIG } from '../models/trading-config';

@Component({
  selector: 'lib-trading',
  standalone: true,
  imports: [
    CommonModule,
    OrderEntryComponent,
    PositionBlotterComponent,
    FinancialChartComponent
  ],
  templateUrl: './trading.html',
  styleUrl: './trading.scss',
})
export class Trading implements OnInit {
  private signalRService = inject(SignalRService);
  private logger = inject(LoggerService);
  private config = inject(TRADING_STUB_CONFIG);

  // Trading desk name
  deskName = signal('Live Trading Terminal');

  // Connection status for real-time data
  isConnected = this.signalRService.isConnected;

  async ngOnInit(): Promise<void> {
    // Connect to SignalR for real-time price updates
    // exchangeId is provided via TRADING_STUB_CONFIG injection token
    try {
      if (!this.signalRService.isConnected()) {
        await this.signalRService.connect(this.config.exchangeId);
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.logException(err, 3); // Error severity
    }
  }
}
