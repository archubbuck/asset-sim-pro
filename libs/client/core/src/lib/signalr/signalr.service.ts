import { Injectable, signal, DestroyRef, inject, InjectionToken, Optional, Inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { MessagePackHubProtocol } from '@microsoft/signalr-protocol-msgpack';
import { PriceUpdateEvent } from '@assetsim/shared/finance-models';
import { LoggerService } from '../logger/logger.service';
import { Subject, throttleTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Decimal from 'decimal.js';

/**
 * Configuration interface for SignalR Service
 */
export interface SignalRConfig {
  /**
   * SignalR hub URL
   * Default: '/api' (Azure Functions endpoint)
   * For local dev: undefined (emulation mode)
   */
  hubUrl?: string;

  /**
   * Enable production SignalR connection
   * When false, service operates in emulation mode
   * Default: false
   */
  enableProduction?: boolean;
}

/**
 * Injection token for SignalR configuration
 */
export const SIGNALR_CONFIG = new InjectionToken<SignalRConfig>('SIGNALR_CONFIG');

/**
 * Connection state for SignalR
 */
export enum ConnectionState {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected',
  Reconnecting = 'Reconnecting',
  Failed = 'Failed',
}

/**
 * SignalR Service
 * 
 * Implements real-time price update subscription using Azure SignalR
 * Following ADR-009: Event-Driven Architecture
 * 
 * Features:
 * - MessagePack protocol for efficiency (matches backend)
 * - Automatic reconnection with exponential backoff
 * - Group-based subscription (ticker:{exchangeId})
 * - Angular Signals for reactive state management
 * - Local development emulation (no cloud dependency)
 * - Proper cleanup on component destruction
 * 
 * Usage:
 * ```typescript
 * @Component({
 *   selector: 'app-trading-terminal',
 *   template: `
 *     @if (signalR.isConnected()) {
 *       @for (price of signalR.latestPrices() | keyvalue; track price.key) {
 *         <div>{{ price.value.symbol }}: {{ price.value.price | currency }}</div>
 *       }
 *     }
 *   `
 * })
 * export class TradingTerminalComponent {
 *   protected signalR = inject(SignalRService);
 *   
 *   async ngOnInit() {
 *     await this.signalR.connect('exchange-id-here');
 *   }
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private destroyRef = inject(DestroyRef);
  private logger = inject(LoggerService);
  private config: SignalRConfig;
  
  // Signals for reactive state
  #connectionState = signal<ConnectionState>(ConnectionState.Disconnected);
  #isConnected = signal<boolean>(false);
  #latestPrices = signal<Map<string, PriceUpdateEvent>>(new Map());
  #currentExchangeId = signal<string | null>(null);
  
  // Read-only signals for consumers
  public readonly connectionState = this.#connectionState.asReadonly();
  public readonly isConnected = this.#isConnected.asReadonly();
  public readonly latestPrices = this.#latestPrices.asReadonly();
  public readonly currentExchangeId = this.#currentExchangeId.asReadonly();

  // RxJS subject for throttling high-frequency price updates (ADR-006)
  private priceUpdateSubject = new Subject<PriceUpdateEvent>();

  // Emulation interval for local development
  private emulationInterval: ReturnType<typeof setInterval> | null = null;
  private emulationSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

  constructor(@Optional() @Inject(SIGNALR_CONFIG) config?: SignalRConfig) {
    this.config = config || { enableProduction: false };
    
    // Setup throttled price update handler (ADR-006: 250ms throttle for market data)
    // Use takeUntilDestroyed to prevent memory leaks
    this.priceUpdateSubject
      .pipe(
        throttleTime(250),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(data => {
        const prices = new Map(this.#latestPrices());
        prices.set(data.symbol, data);
        this.#latestPrices.set(prices);
        
        this.logger.logTrace('Price update received', { 
          symbol: data.symbol, 
          price: data.price,
          change: data.change
        });
      });
    
    // Auto-cleanup on component destruction
    this.destroyRef.onDestroy(() => {
      void this.disconnect();
    });
  }

  /**
   * Connect to SignalR hub and subscribe to exchange's ticker group
   * In local dev mode (enableProduction: false), uses emulation
   * 
   * @param exchangeId - Exchange ID to subscribe to
   * @throws Error if connection fails
   */
  async connect(exchangeId: string): Promise<void> {
    if (!exchangeId) {
      throw new Error('Exchange ID is required to connect to SignalR');
    }

    // Disconnect existing connection if any
    if (this.connection || this.emulationInterval) {
      await this.disconnect();
    }

    this.#currentExchangeId.set(exchangeId);

    // Check if we should use production SignalR or emulation
    if (this.config.enableProduction) {
      await this.connectProduction(exchangeId);
    } else {
      this.connectEmulation(exchangeId);
    }
  }

  /**
   * Connect to production Azure SignalR
   */
  private async connectProduction(exchangeId: string): Promise<void> {
    try {
      this.#connectionState.set(ConnectionState.Connecting);
      
      const hubUrl = this.config.hubUrl || '/api';
      
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withHubProtocol(new MessagePackHubProtocol())
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 0ms, 2s, 10s, 30s, then 60s
            if (retryContext.previousRetryCount === 0) return 0;
            if (retryContext.previousRetryCount === 1) return 2000;
            if (retryContext.previousRetryCount === 2) return 10000;
            if (retryContext.previousRetryCount === 3) return 30000;
            return 60000;
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Setup event handlers
      this.setupConnectionHandlers();
      this.setupPriceUpdateHandler();

      // Start connection
      await this.connection.start();
      
      // NOTE: Azure Web PubSub requires server-side group management
      // Group subscription should be handled via an HTTP endpoint that calls
      // addToTickerGroup from signalr-broadcast.ts
      // For now, connection is established but group subscription needs backend endpoint
      // TODO: Create Azure Function endpoint /api/signalr/join/{exchangeId}
      
      this.#connectionState.set(ConnectionState.Connected);
      this.#isConnected.set(true);
      
      this.logger.logEvent('SignalRConnected', { 
        exchangeId, 
        mode: 'production',
        hubUrl,
        note: 'Group subscription requires backend HTTP endpoint'
      });
    } catch (error) {
      this.#connectionState.set(ConnectionState.Failed);
      this.#isConnected.set(false);
      
      const err = error as Error;
      this.logger.logException(err, 3); // Error severity
      throw new Error(`Failed to connect to SignalR: ${err.message}`);
    }
  }

  /**
   * Setup connection state handlers for production SignalR
   */
  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.onreconnecting(() => {
      this.#connectionState.set(ConnectionState.Reconnecting);
      this.#isConnected.set(false);
      this.logger.logTrace('SignalR reconnecting...');
    });

    this.connection.onreconnected((connectionId) => {
      this.#connectionState.set(ConnectionState.Connected);
      this.#isConnected.set(true);
      this.logger.logEvent('SignalRReconnected', { connectionId });
      
      // NOTE: After reconnection, group re-subscription needs backend HTTP call
      // Cannot use client-side invoke with Azure Web PubSub
      const exchangeId = this.#currentExchangeId();
      if (exchangeId) {
        this.logger.logTrace('Reconnected - group resubscription requires backend endpoint', {
          exchangeId
        });
      }
    });

    this.connection.onclose((error) => {
      this.#connectionState.set(ConnectionState.Disconnected);
      this.#isConnected.set(false);
      
      if (error) {
        this.logger.logException(error as Error, 2); // Warning severity
      } else {
        this.logger.logTrace('SignalR connection closed');
      }
    });
  }

  /**
   * Setup price update message handler
   * 
   * NOTE: Azure Web PubSub sends raw MessagePack-encoded binary data,
   * not standard SignalR protocol messages with target/arguments structure.
   * The MessagePackHubProtocol handles decoding automatically.
   */
  private setupPriceUpdateHandler(): void {
    if (!this.connection) return;

    // Azure Web PubSub with MessagePack protocol automatically decodes messages
    // and triggers the appropriate event handler
    this.connection.on('PriceUpdate', (data: PriceUpdateEvent) => {
      // Send to throttled subject (ADR-006: 250ms throttle for market data)
      this.priceUpdateSubject.next(data);
    });
  }

  /**
   * Setup emulation mode for local development
   * Generates mock price updates every 1 second
   */
  private connectEmulation(exchangeId: string): void {
    this.logger.logEvent('SignalREmulationMode', { exchangeId });
    
    // Initialize with starting prices
    const prices = new Map<string, PriceUpdateEvent>();
    this.emulationSymbols.forEach(symbol => {
      prices.set(symbol, {
        exchangeId,
        symbol,
        price: 100 + Math.random() * 100, // Random start price 100-200
        change: 0,
        changePercent: 0,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date().toISOString(),
      });
    });
    this.#latestPrices.set(prices);
    
    this.#connectionState.set(ConnectionState.Connected);
    this.#isConnected.set(true);

    // Generate updates every 1 second
    this.emulationInterval = setInterval(() => {
      const currentPrices = new Map(this.#latestPrices());
      
      this.emulationSymbols.forEach(symbol => {
        const currentPrice = currentPrices.get(symbol);
        if (!currentPrice) return;

        // Random price movement: -2% to +2%
        // ADR-006: Use Decimal.js for all financial calculations
        const changePercent = (Math.random() - 0.5) * 4; // -2 to +2
        const priceDecimal = new Decimal(currentPrice.price);
        const changeDecimal = priceDecimal.times(changePercent).dividedBy(100);
        const newPriceDecimal = priceDecimal.plus(changeDecimal);

        const update: PriceUpdateEvent = {
          exchangeId,
          symbol,
          price: newPriceDecimal.toNumber(),
          change: changeDecimal.toNumber(),
          changePercent,
          volume: currentPrice.volume + Math.floor(Math.random() * 10000),
          timestamp: new Date().toISOString(),
        };

        currentPrices.set(symbol, update);
      });
      
      this.#latestPrices.set(currentPrices);
    }, 1000);
  }

  /**
   * Disconnect from SignalR and cleanup resources
   */
  async disconnect(): Promise<void> {
    // Stop emulation if running
    if (this.emulationInterval) {
      clearInterval(this.emulationInterval);
      this.emulationInterval = null;
    }

    // Disconnect production SignalR if connected
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (error) {
        this.logger.logException(error as Error, 2); // Warning severity
      } finally {
        this.connection = null;
      }
    }

    this.#connectionState.set(ConnectionState.Disconnected);
    this.#isConnected.set(false);
    this.#currentExchangeId.set(null);
    this.#latestPrices.set(new Map());
    
    // Complete price update stream to allow subscribers to clean up
    this.priceUpdateSubject.complete();
    
    this.logger.logEvent('SignalRDisconnected');
  }

  /**
   * Get the latest price for a specific symbol
   * @param symbol - Trading symbol
   * @returns Latest price update or undefined if not found
   */
  getPrice(symbol: string): PriceUpdateEvent | undefined {
    return this.#latestPrices().get(symbol);
  }

  /**
   * Check if currently connected
   * @returns True if connected (either production or emulation)
   */
  isCurrentlyConnected(): boolean {
    return this.isConnected();
  }
}
