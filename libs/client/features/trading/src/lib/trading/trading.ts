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

  // Trading desk name
  deskName = signal('Live Trading Terminal');

  // Connection status for real-time data
  isConnected = this.signalRService.isConnected;

  async ngOnInit(): Promise<void> {
    // Connect to SignalR for real-time price updates
    // In a real implementation, exchangeId would come from user context
    try {
      if (!this.signalRService.isConnected()) {
        await this.signalRService.connect('demo-exchange-001');
      }
    } catch (error) {
      this.logger.logException(error as Error, 3); // Error severity
    }
  }
}
