import { TestBed } from '@angular/core/testing';
import { SignalRService, SIGNALR_CONFIG, ConnectionState } from './signalr.service';
import { LoggerService } from '../logger/logger.service';
import { PriceUpdateEvent } from '@assetsim/shared/finance-models';
import * as signalR from '@microsoft/signalr';

// Mock SignalR
jest.mock('@microsoft/signalr');
jest.mock('@microsoft/signalr-protocol-msgpack');

describe('SignalRService', () => {
  let service: SignalRService;
  let mockLoggerService: jest.Mocked<LoggerService>;
  let mockConnection: jest.Mocked<signalR.HubConnection>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock logger
    mockLoggerService = {
      logEvent: jest.fn(),
      logTrace: jest.fn(),
      logException: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    // Create mock HubConnection
    mockConnection = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      invoke: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      onreconnecting: jest.fn(),
      onreconnected: jest.fn(),
      onclose: jest.fn(),
      state: signalR.HubConnectionState.Disconnected,
    } as unknown as jest.Mocked<signalR.HubConnection>;

    // Mock HubConnectionBuilder
    const mockBuilder = {
      withUrl: jest.fn().mockReturnThis(),
      withHubProtocol: jest.fn().mockReturnThis(),
      withAutomaticReconnect: jest.fn().mockReturnThis(),
      configureLogging: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue(mockConnection),
    };

    (signalR.HubConnectionBuilder as jest.Mock) = jest.fn(() => mockBuilder);
  });

  describe('Emulation Mode (Default)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: mockLoggerService }
        ]
      });
      service = TestBed.inject(SignalRService);
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start in disconnected state', () => {
      expect(service.connectionState()).toBe(ConnectionState.Disconnected);
      expect(service.isConnected()).toBe(false);
      expect(service.currentExchangeId()).toBeNull();
      expect(service.latestPrices().size).toBe(0);
    });

    it('should reject connection without exchange ID', async () => {
      await expect(service.connect('')).rejects.toThrow('Exchange ID is required to connect to SignalR');
    });

    it('should connect in emulation mode and generate mock prices', async () => {
      const exchangeId = 'test-exchange-123';
      
      await service.connect(exchangeId);

      expect(service.connectionState()).toBe(ConnectionState.Connected);
      expect(service.isConnected()).toBe(true);
      expect(service.currentExchangeId()).toBe(exchangeId);
      
      // Should have 5 mock symbols initialized
      const prices = service.latestPrices();
      expect(prices.size).toBe(5);
      expect(prices.has('AAPL')).toBe(true);
      expect(prices.has('MSFT')).toBe(true);
      expect(prices.has('GOOGL')).toBe(true);
      expect(prices.has('AMZN')).toBe(true);
      expect(prices.has('TSLA')).toBe(true);

      // Verify logger was called
      expect(mockLoggerService.logEvent).toHaveBeenCalledWith(
        'SignalREmulationMode',
        { exchangeId }
      );
    });

    it('should update prices every second in emulation mode', async () => {
      await service.connect('test-exchange');

      const initialPrices = new Map(service.latestPrices());
      const initialApplePrice = initialPrices.get('AAPL')!.price;

      // Advance time by 1 second
      jest.advanceTimersByTime(1000);

      const updatedPrices = service.latestPrices();
      const updatedApplePrice = updatedPrices.get('AAPL')!.price;

      // Price should have changed
      expect(updatedApplePrice).not.toBe(initialApplePrice);

      // Timestamp should be updated
      const appleUpdate = updatedPrices.get('AAPL')!;
      expect(appleUpdate.timestamp).toBeDefined();
      expect(appleUpdate.exchangeId).toBe('test-exchange');
    });

    it('should disconnect and cleanup emulation', async () => {
      await service.connect('test-exchange');

      expect(service.isConnected()).toBe(true);

      await service.disconnect();

      expect(service.isConnected()).toBe(false);
      expect(service.connectionState()).toBe(ConnectionState.Disconnected);
      expect(service.currentExchangeId()).toBeNull();
      expect(service.latestPrices().size).toBe(0);
      expect(mockLoggerService.logEvent).toHaveBeenCalledWith('SignalRDisconnected');
    });

    it('should get price for specific symbol', async () => {
      await service.connect('test-exchange');

      const applePrice = service.getPrice('AAPL');
      expect(applePrice).toBeDefined();
      expect(applePrice?.symbol).toBe('AAPL');
      expect(applePrice?.price).toBeGreaterThan(0);

      const nonexistentPrice = service.getPrice('NONEXISTENT');
      expect(nonexistentPrice).toBeUndefined();
    });

    it('should handle reconnection by disconnecting first', async () => {
      await service.connect('exchange-1');
      
      expect(service.currentExchangeId()).toBe('exchange-1');

      await service.connect('exchange-2');

      expect(service.currentExchangeId()).toBe('exchange-2');
      expect(service.isConnected()).toBe(true);
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: mockLoggerService },
          {
            provide: SIGNALR_CONFIG,
            useValue: {
              enableProduction: true,
              hubUrl: '/api'
            }
          }
        ]
      });
      service = TestBed.inject(SignalRService);
    });

    it('should connect to production SignalR', async () => {
      const exchangeId = 'prod-exchange-123';

      await service.connect(exchangeId);

      expect(mockConnection.start).toHaveBeenCalled();
      expect(mockConnection.invoke).toHaveBeenCalledWith('JoinGroup', `ticker:${exchangeId}`);
      expect(service.connectionState()).toBe(ConnectionState.Connected);
      expect(service.isConnected()).toBe(true);
      expect(mockLoggerService.logEvent).toHaveBeenCalledWith(
        'SignalRConnected',
        {
          exchangeId,
          mode: 'production',
          hubUrl: '/api'
        }
      );
    });

    it('should setup price update handler in production mode', async () => {
      await service.connect('prod-exchange');

      expect(mockConnection.on).toHaveBeenCalledWith(
        'PriceUpdate',
        expect.any(Function)
      );
    });

    it('should receive and process price updates in production mode', async () => {
      let priceUpdateHandler: ((data: PriceUpdateEvent) => void) | undefined;
      
      mockConnection.on.mockImplementation((event, handler) => {
        if (event === 'PriceUpdate') {
          priceUpdateHandler = handler;
        }
      });

      await service.connect('prod-exchange');

      const mockPriceUpdate: PriceUpdateEvent = {
        exchangeId: 'prod-exchange',
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69,
        volume: 5000000,
        timestamp: '2026-01-24T00:00:00Z'
      };

      // Simulate receiving a price update
      expect(priceUpdateHandler).toBeDefined();
      priceUpdateHandler!(mockPriceUpdate);

      const prices = service.latestPrices();
      expect(prices.has('AAPL')).toBe(true);
      expect(prices.get('AAPL')).toEqual(mockPriceUpdate);
      
      expect(mockLoggerService.logTrace).toHaveBeenCalledWith(
        'Price update received',
        {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.50
        }
      );
    });

    it('should handle connection errors in production mode', async () => {
      const errorMessage = 'Connection failed';
      mockConnection.start.mockRejectedValueOnce(new Error(errorMessage));

      await expect(service.connect('prod-exchange'))
        .rejects.toThrow(`Failed to connect to SignalR: ${errorMessage}`);

      expect(service.connectionState()).toBe(ConnectionState.Failed);
      expect(service.isConnected()).toBe(false);
      expect(mockLoggerService.logException).toHaveBeenCalled();
    });

    it('should setup reconnection handlers', async () => {
      await service.connect('prod-exchange');

      expect(mockConnection.onreconnecting).toHaveBeenCalled();
      expect(mockConnection.onreconnected).toHaveBeenCalled();
      expect(mockConnection.onclose).toHaveBeenCalled();
    });

    it('should handle reconnecting state', async () => {
      let reconnectingHandler: (() => void) | undefined;
      
      mockConnection.onreconnecting.mockImplementation((handler) => {
        reconnectingHandler = handler;
      });

      await service.connect('prod-exchange');
      
      // Simulate reconnecting
      expect(reconnectingHandler).toBeDefined();
      reconnectingHandler!();

      expect(service.connectionState()).toBe(ConnectionState.Reconnecting);
      expect(service.isConnected()).toBe(false);
      expect(mockLoggerService.logTrace).toHaveBeenCalledWith('SignalR reconnecting...');
    });

    it('should handle reconnected state and rejoin group', async () => {
      let reconnectedHandler: ((connectionId?: string) => void) | undefined;
      
      mockConnection.onreconnected.mockImplementation((handler) => {
        reconnectedHandler = handler;
      });

      const exchangeId = 'prod-exchange';
      await service.connect(exchangeId);
      
      // Clear previous invoke calls
      mockConnection.invoke.mockClear();

      // Simulate reconnection
      expect(reconnectedHandler).toBeDefined();
      reconnectedHandler!('new-connection-id');

      expect(service.connectionState()).toBe(ConnectionState.Connected);
      expect(service.isConnected()).toBe(true);
      
      // Should rejoin the group
      expect(mockConnection.invoke).toHaveBeenCalledWith('JoinGroup', `ticker:${exchangeId}`);
      
      expect(mockLoggerService.logEvent).toHaveBeenCalledWith(
        'SignalRReconnected',
        { connectionId: 'new-connection-id' }
      );
    });

    it('should handle close with error', async () => {
      let closeHandler: ((error?: Error) => void) | undefined;
      
      mockConnection.onclose.mockImplementation((handler) => {
        closeHandler = handler;
      });

      await service.connect('prod-exchange');
      
      const closeError = new Error('Connection closed unexpectedly');
      expect(closeHandler).toBeDefined();
      closeHandler!(closeError);

      expect(service.connectionState()).toBe(ConnectionState.Disconnected);
      expect(service.isConnected()).toBe(false);
      expect(mockLoggerService.logException).toHaveBeenCalledWith(closeError, 2);
    });

    it('should handle close without error', async () => {
      let closeHandler: ((error?: Error) => void) | undefined;
      
      mockConnection.onclose.mockImplementation((handler) => {
        closeHandler = handler;
      });

      await service.connect('prod-exchange');
      
      expect(closeHandler).toBeDefined();
      closeHandler!();

      expect(service.connectionState()).toBe(ConnectionState.Disconnected);
      expect(service.isConnected()).toBe(false);
      expect(mockLoggerService.logTrace).toHaveBeenCalledWith('SignalR connection closed');
    });

    it('should disconnect production connection', async () => {
      await service.connect('prod-exchange');
      
      await service.disconnect();

      expect(mockConnection.stop).toHaveBeenCalled();
      expect(service.isConnected()).toBe(false);
      expect(service.connectionState()).toBe(ConnectionState.Disconnected);
      expect(mockLoggerService.logEvent).toHaveBeenCalledWith('SignalRDisconnected');
    });

    it('should handle disconnect errors gracefully', async () => {
      await service.connect('prod-exchange');
      
      const disconnectError = new Error('Disconnect failed');
      mockConnection.stop.mockRejectedValueOnce(disconnectError);

      await service.disconnect();

      expect(mockLoggerService.logException).toHaveBeenCalledWith(disconnectError, 2);
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should use custom hub URL when provided', async () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: mockLoggerService },
          {
            provide: SIGNALR_CONFIG,
            useValue: {
              enableProduction: true,
              hubUrl: '/custom-hub'
            }
          }
        ]
      });
      service = TestBed.inject(SignalRService);

      await service.connect('test-exchange');

      // Verify HubConnectionBuilder was called with custom URL
      const builderInstance = (signalR.HubConnectionBuilder as jest.Mock).mock.results[0].value;
      expect(builderInstance.withUrl).toHaveBeenCalledWith('/custom-hub');
    });

    it('should default to /api when no hub URL provided', async () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: mockLoggerService },
          {
            provide: SIGNALR_CONFIG,
            useValue: {
              enableProduction: true
            }
          }
        ]
      });
      service = TestBed.inject(SignalRService);

      await service.connect('test-exchange');

      const builderInstance = (signalR.HubConnectionBuilder as jest.Mock).mock.results[0].value;
      expect(builderInstance.withUrl).toHaveBeenCalledWith('/api');
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: mockLoggerService }
        ]
      });
      service = TestBed.inject(SignalRService);
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should return correct connection status', async () => {
      expect(service.isCurrentlyConnected()).toBe(false);

      await service.connect('test-exchange');

      expect(service.isCurrentlyConnected()).toBe(true);

      await service.disconnect();

      expect(service.isCurrentlyConnected()).toBe(false);
    });
  });
});
