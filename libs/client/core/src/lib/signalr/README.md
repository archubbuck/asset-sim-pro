# SignalR Service

Real-time price update service for AssetSim Pro frontend, implementing ADR-009 Event-Driven Architecture.

## Features

- **Real-time Price Updates**: Subscribe to live market data via Azure SignalR
- **MessagePack Protocol**: Efficient binary protocol matching backend implementation
- **Automatic Reconnection**: Exponential backoff strategy for resilient connections
- **Angular Signals**: Reactive state management for seamless UI updates
- **Local Development Mode**: Built-in emulation (no cloud dependency)
- **Group Subscriptions**: Exchange-scoped ticker groups (`ticker:{exchangeId}`)
- **Automatic Cleanup**: Proper resource management via Angular DestroyRef

## Installation

The required dependencies are already installed:
- `@microsoft/signalr` - SignalR client library
- `@microsoft/signalr-protocol-msgpack` - MessagePack protocol for efficiency

## Configuration

### Local Development (Default)

By default, the service operates in **emulation mode** with no configuration needed:

```typescript
import { SignalRService } from '@assetsim/client/core';

@Component({
  // ...
})
export class MyComponent {
  private signalR = inject(SignalRService);
  
  async ngOnInit() {
    // Automatically uses emulation mode
    await this.signalR.connect('test-exchange-id');
  }
}
```

### Production Mode

For production with Azure SignalR, configure the service:

```typescript
import { ApplicationConfig } from '@angular/core';
import { SIGNALR_CONFIG } from '@assetsim/client/core';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: SIGNALR_CONFIG,
      useValue: {
        enableProduction: true,
        hubUrl: '/api' // Azure Functions SignalR endpoint
      }
    }
  ]
};
```

## Usage

### Basic Connection

```typescript
import { Component, inject } from '@angular/core';
import { SignalRService } from '@assetsim/client/core';

@Component({
  selector: 'app-price-ticker',
  template: `
    <div class="ticker">
      @if (signalR.isConnected()) {
        <span class="status connected">Connected</span>
        @for (price of signalR.latestPrices() | keyvalue; track price.key) {
          <div class="price-item">
            <span class="symbol">{{ price.value.symbol }}</span>
            <span class="price">{{ price.value.price | currency }}</span>
            <span class="change" [class.positive]="price.value.change > 0">
              {{ price.value.changePercent | number:'1.2-2' }}%
            </span>
          </div>
        }
      } @else {
        <span class="status disconnected">Disconnected</span>
      }
    </div>
  `
})
export class PriceTickerComponent {
  protected signalR = inject(SignalRService);
  
  async ngOnInit() {
    const exchangeId = 'your-exchange-id';
    await this.signalR.connect(exchangeId);
  }
}
```

### Connection State Monitoring

```typescript
import { Component, effect, inject } from '@angular/core';
import { SignalRService, ConnectionState } from '@assetsim/client/core';
import { LoggerService } from '@assetsim/client/core';

@Component({
  selector: 'app-connection-indicator',
  template: `
    <div class="indicator" [attr.data-state]="signalR.connectionState()">
      {{ signalR.connectionState() }}
    </div>
  `
})
export class ConnectionIndicatorComponent {
  protected signalR = inject(SignalRService);
  private logger = inject(LoggerService);
  
  constructor() {
    // React to connection state changes
    effect(() => {
      const state = this.signalR.connectionState();
      if (state === ConnectionState.Reconnecting) {
        this.logger.logTrace('Connection lost, attempting to reconnect...');
      } else if (state === ConnectionState.Connected) {
        this.logger.logEvent('SignalRConnectionEstablished');
      }
    });
  }
}
```

### Accessing Specific Symbol Prices

```typescript
import { Component, inject, Input, computed } from '@angular/core';
import { SignalRService } from '@assetsim/client/core';

@Component({
  selector: 'app-symbol-detail',
  template: `
    @if (currentPrice()) {
      <div class="symbol-detail">
        <h2>{{ symbol }}</h2>
        <p class="price">{{ currentPrice()!.price | currency }}</p>
        <p class="volume">Volume: {{ currentPrice()!.volume | number }}</p>
        <p class="timestamp">{{ currentPrice()!.timestamp | date:'medium' }}</p>
      </div>
    }
  `
})
export class SymbolDetailComponent {
  private signalR = inject(SignalRService);
  
  @Input() symbol = 'AAPL';
  
  protected currentPrice = computed(() => 
    this.signalR.latestPrices().get(this.symbol)
  );
}
```

## API Reference

### SignalRService

#### Properties

- `connectionState: Signal<ConnectionState>` - Current connection state (read-only)
- `isConnected: Signal<boolean>` - Whether currently connected (read-only)
- `latestPrices: Signal<Map<string, PriceUpdateEvent>>` - Latest prices for all symbols (read-only)
- `currentExchangeId: Signal<string | null>` - Currently connected exchange ID (read-only)

#### Methods

- `connect(exchangeId: string): Promise<void>` - Connect to SignalR and subscribe to exchange group
- `disconnect(): Promise<void>` - Disconnect and cleanup resources
- `getPrice(symbol: string): PriceUpdateEvent | undefined` - Get latest price for specific symbol
- `isCurrentlyConnected(): boolean` - Check if currently connected

#### Types

```typescript
enum ConnectionState {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected',
  Reconnecting = 'Reconnecting',
  Failed = 'Failed',
}

interface PriceUpdateEvent {
  exchangeId: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string; // ISO 8601
}
```

## Emulation Mode

In local development (default), the service generates mock price updates:

- **Symbols**: AAPL, MSFT, GOOGL, AMZN, TSLA
- **Update Frequency**: Every 1 second
- **Price Movement**: Random ±2% per tick
- **Starting Prices**: Random between $100-$200

This allows full frontend development without backend or cloud dependencies.

## Production Mode

When `enableProduction: true` is configured:

- **Protocol**: MessagePack over WebSocket
- **Hub URL**: `/api` (Azure Functions SignalR endpoint)
- **Reconnection**: Exponential backoff (0ms, 2s, 10s, 30s, 60s)
- **Group Pattern**: `ticker:{exchangeId}`
- **Message Handler**: `PriceUpdate` event

### Reconnection Strategy

The service automatically reconnects with exponential backoff:

1. **Attempt 1**: Immediate (0ms)
2. **Attempt 2**: 2 seconds
3. **Attempt 3**: 10 seconds
4. **Attempt 4**: 30 seconds
5. **Attempt 5+**: 60 seconds

After reconnection, group resubscription requires calling a backend HTTP endpoint (e.g., `/api/signalr/join/{exchangeId}`) as Azure Web PubSub requires server-side group management.

## Testing

The service includes comprehensive unit tests (23 tests, 90%+ coverage):

```bash
# Run SignalR service tests
npx jest libs/client/core/src/lib/signalr

# Run with coverage
npx jest libs/client/core/src/lib/signalr --coverage
```

### Test Coverage

- ✅ Connection lifecycle (connect, disconnect, reconnect)
- ✅ Price update receipt and processing
- ✅ Automatic reconnection behavior
- ✅ Error handling and recovery
- ✅ Emulation mode functionality
- ✅ Production mode configuration
- ✅ Resource cleanup

## Architecture

### Integration with Backend

The frontend SignalR service integrates with the backend implementation:

**Backend** (`apps/backend/src/lib/signalr-broadcast.ts`):
- Broadcasts via Azure Web PubSub
- Uses MessagePack encoding
- Groups: `ticker:{ExchangeId}`
- Message: Raw MessagePack-encoded `PriceUpdateEvent` payload

**Frontend** (this service):
- Connects to Azure Web PubSub hub
- Group subscription requires backend HTTP endpoint (calls `addToTickerGroup` server-side)
- Processes decoded `PriceUpdateEvent` payloads
- RxJS throttling (250ms) prevents UI flooding (ADR-006)
- Updates reactive signals

**Note**: Azure Web PubSub requires server-side group management. A backend HTTP endpoint (e.g., `/api/signalr/join/{exchangeId}`) should call `addToTickerGroup` from `signalr-broadcast.ts` to add the connection to the appropriate group.

### Data Flow

```
Backend Timer Trigger (1s)
  ↓
Price Generation (Market Engine)
  ↓
SignalR Broadcast (MessagePack)
  ↓
Azure SignalR Group (ticker:{exchangeId})
  ↓
Frontend SignalRService.connection.on('PriceUpdate')
  ↓
Update latestPrices signal
  ↓
UI automatically updates (Angular Signals)
```

## Best Practices

### 1. Connect Early, Disconnect Automatically

```typescript
@Component({/* ... */})
export class TradingComponent {
  private signalR = inject(SignalRService);
  
  async ngOnInit() {
    // Connect early in component lifecycle
    await this.signalR.connect(this.exchangeId);
    // No need to disconnect - DestroyRef handles cleanup
  }
}
```

### 2. Use Computed Signals for Derived State

```typescript
protected symbolPrices = computed(() => {
  const prices = this.signalR.latestPrices();
  return this.watchlist.map(symbol => prices.get(symbol));
});
```

### 3. Handle Connection Failures

```typescript
import { LoggerService } from '@assetsim/client/core';

async connectWithRetry() {
  try {
    await this.signalR.connect(this.exchangeId);
  } catch (error) {
    this.logger.logException(error as Error, 3); // Error severity
    // Show user notification or retry logic
  }
}
```

### 4. Monitor Connection State

```typescript
protected connectionClass = computed(() => ({
  'connected': this.signalR.connectionState() === ConnectionState.Connected,
  'reconnecting': this.signalR.connectionState() === ConnectionState.Reconnecting,
  'disconnected': this.signalR.connectionState() === ConnectionState.Disconnected,
}));
```

## Troubleshooting

### Connection Issues

**Problem**: Service fails to connect in production

**Solution**: 
1. Verify `SIGNALR_CONFIG` is provided with `enableProduction: true`
2. Check Azure SignalR connection string in backend
3. Ensure Azure Functions are running
4. Verify network allows WebSocket connections

### Missing Price Updates

**Problem**: Connected but no price updates received

**Solution**:
1. Check `exchangeId` is correct
2. Verify backend is broadcasting to correct group
3. Check browser console for SignalR errors
4. Confirm MessagePack protocol is enabled

### Emulation Not Working

**Problem**: No mock data in local development

**Solution**:
1. Ensure `enableProduction` is NOT set (or set to false)
2. Check browser console for JavaScript errors
3. Verify the component calls `connect()` method
4. Check if component is properly initialized

## Performance Considerations

### Memory Management

The service stores latest prices in a Map, which grows with symbol count:
- **Typical**: 50-200 symbols (~10-40 KB)
- **Large**: 1000+ symbols (~200+ KB)

For very large symbol sets, consider filtering or pagination.

### Update Frequency

Backend uses deadband filtering ($0.01 threshold) to reduce bandwidth.
Frontend receives updates only when prices change meaningfully.

### CPU Usage

MessagePack decoding is lightweight (<1ms per message).
Angular Signals efficiently batch UI updates.

## Security

- ✅ No security vulnerabilities (CodeQL scan passed)
- ✅ Uses Azure SignalR authentication (production mode)
- ✅ Group-based access control (`ticker:{exchangeId}`)
- ✅ No sensitive data in emulation mode

## References

- **ADR-009**: Event-Driven Architecture (SignalR integration)
- **Backend Implementation**: `apps/backend/src/lib/signalr-broadcast.ts`
- **Backend Tests**: `apps/backend/src/lib/signalr-broadcast.spec.ts`
- **Documentation**: `BACKEND_FRONTEND_INTEGRATION.md`
- **Evaluation**: `PHASE_5_EVALUATION.md`

---

**Version**: 1.0  
**Last Updated**: January 24, 2026  
**Maintained By**: AssetSim Pro Engineering Team
