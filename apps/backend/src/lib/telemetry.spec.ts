import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InvocationContext } from '@azure/functions';

// Mock Application Insights
vi.mock('applicationinsights', () => ({
  default: {
    setup: vi.fn().mockReturnThis(),
    setAutoCollectRequests: vi.fn().mockReturnThis(),
    setAutoCollectPerformance: vi.fn().mockReturnThis(),
    setAutoCollectExceptions: vi.fn().mockReturnThis(),
    setAutoCollectDependencies: vi.fn().mockReturnThis(),
    setAutoCollectConsole: vi.fn().mockReturnThis(),
    setUseDiskRetryCaching: vi.fn().mockReturnThis(),
    start: vi.fn().mockReturnThis(),
    defaultClient: {
      trackMetric: vi.fn(),
    },
  },
  setup: vi.fn().mockReturnThis(),
  setAutoCollectRequests: vi.fn().mockReturnThis(),
  setAutoCollectPerformance: vi.fn().mockReturnThis(),
  setAutoCollectExceptions: vi.fn().mockReturnThis(),
  setAutoCollectDependencies: vi.fn().mockReturnThis(),
  setAutoCollectConsole: vi.fn().mockReturnThis(),
  setUseDiskRetryCaching: vi.fn().mockReturnThis(),
  start: vi.fn(),
  defaultClient: {
    trackMetric: vi.fn(),
  },
}));

import * as appInsights from 'applicationinsights';
import {
  trackUpdateBroadcasted,
  trackBroadcastFailure,
  trackDeadbandFiltered,
  trackBroadcastLatency,
  resetTelemetryClient,
} from './telemetry';

describe('Telemetry Service (ADR-025)', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    vi.clearAllMocks();
    resetTelemetryClient();
    
    mockContext = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as unknown as InvocationContext;

    // Set environment variable for tests
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 
      'InstrumentationKey=test-key;IngestionEndpoint=https://test.applicationinsights.azure.com/';
  });

  afterEach(() => {
    // Clean up environment variables to prevent test pollution
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  });

  describe('trackUpdateBroadcasted', () => {
    it('should track UpdatesBroadcasted metric with correct properties', () => {
      trackUpdateBroadcasted('exchange-123', 'AAPL', mockContext);

      expect(appInsights.defaultClient?.trackMetric).toHaveBeenCalledWith({
        name: 'UpdatesBroadcasted',
        value: 1,
        properties: {
          exchangeId: 'exchange-123',
          symbol: 'AAPL',
        },
      });
    });

    it('should handle different exchange and symbol combinations', () => {
      trackUpdateBroadcasted('exchange-456', 'BTC', mockContext);
      trackUpdateBroadcasted('exchange-789', 'ETH', mockContext);

      expect(appInsights.defaultClient?.trackMetric).toHaveBeenCalledTimes(2);
      expect(appInsights.defaultClient?.trackMetric).toHaveBeenNthCalledWith(1, expect.objectContaining({
        name: 'UpdatesBroadcasted',
        properties: { exchangeId: 'exchange-456', symbol: 'BTC' },
      }));
      expect(appInsights.defaultClient?.trackMetric).toHaveBeenNthCalledWith(2, expect.objectContaining({
        name: 'UpdatesBroadcasted',
        properties: { exchangeId: 'exchange-789', symbol: 'ETH' },
      }));
    });
  });

  describe('trackBroadcastFailure', () => {
    it('should track BroadcastFailures metric with error details', () => {
      trackBroadcastFailure('exchange-123', 'AAPL', 'Network error', mockContext);

      expect(appInsights.defaultClient?.trackMetric).toHaveBeenCalledWith({
        name: 'BroadcastFailures',
        value: 1,
        properties: {
          exchangeId: 'exchange-123',
          symbol: 'AAPL',
          error: 'Network error',
        },
      });
    });

    it('should track multiple failures', () => {
      trackBroadcastFailure('exchange-123', 'AAPL', 'Timeout', mockContext);
      trackBroadcastFailure('exchange-456', 'BTC', 'Connection refused', mockContext);

      expect(appInsights.defaultClient?.trackMetric).toHaveBeenCalledTimes(2);
    });
  });

  describe('trackDeadbandFiltered', () => {
    it('should track DeadbandFiltered metric', () => {
      trackDeadbandFiltered('exchange-123', 'AAPL', mockContext);

      expect(appInsights.defaultClient?.trackMetric).toHaveBeenCalledWith({
        name: 'DeadbandFiltered',
        value: 1,
        properties: {
          exchangeId: 'exchange-123',
          symbol: 'AAPL',
        },
      });
    });

    it('should track multiple filtered updates', () => {
      trackDeadbandFiltered('exchange-123', 'AAPL', mockContext);
      trackDeadbandFiltered('exchange-123', 'GOOGL', mockContext);
      trackDeadbandFiltered('exchange-456', 'TSLA', mockContext);

      expect(appInsights.defaultClient?.trackMetric).toHaveBeenCalledTimes(3);
    });
  });

  describe('trackBroadcastLatency', () => {
    it('should track BroadcastLatency metric with duration', () => {
      trackBroadcastLatency(25, 'exchange-123', 'AAPL', mockContext);

      expect(appInsights.defaultClient?.trackMetric).toHaveBeenCalledWith({
        name: 'BroadcastLatency',
        value: 25,
        properties: {
          exchangeId: 'exchange-123',
          symbol: 'AAPL',
        },
      });
    });

    it('should track different latency values', () => {
      trackBroadcastLatency(10, 'exchange-123', 'AAPL', mockContext);
      trackBroadcastLatency(50, 'exchange-456', 'BTC', mockContext);
      trackBroadcastLatency(100, 'exchange-789', 'ETH', mockContext);

      expect(appInsights.defaultClient?.trackMetric).toHaveBeenCalledTimes(3);
      expect(appInsights.defaultClient?.trackMetric).toHaveBeenNthCalledWith(1, expect.objectContaining({ value: 10 }));
      expect(appInsights.defaultClient?.trackMetric).toHaveBeenNthCalledWith(2, expect.objectContaining({ value: 50 }));
      expect(appInsights.defaultClient?.trackMetric).toHaveBeenNthCalledWith(3, expect.objectContaining({ value: 100 }));
    });
  });

  describe('Error Handling', () => {
    it('should handle telemetry errors gracefully without throwing', () => {
      vi.mocked(appInsights.defaultClient!.trackMetric).mockImplementationOnce(() => {
        throw new Error('Telemetry service unavailable');
      });

      // Should not throw
      expect(() => {
        trackUpdateBroadcasted('exchange-123', 'AAPL', mockContext);
      }).not.toThrow();

      // Should log warning
      expect(mockContext.warn).toHaveBeenCalled();
    });
  });

  describe('Application Insights not configured', () => {
    beforeEach(() => {
      // Simulate no Application Insights configuration
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      resetTelemetryClient();
      // Override the mock to return null
      vi.mocked(appInsights).defaultClient = null as any;
    });

    it('should handle missing Application Insights configuration gracefully', () => {
      // Should not throw when Application Insights is not configured
      expect(() => {
        trackUpdateBroadcasted('exchange-123', 'AAPL', mockContext);
        trackBroadcastFailure('exchange-123', 'AAPL', 'error', mockContext);
        trackDeadbandFiltered('exchange-123', 'AAPL', mockContext);
        trackBroadcastLatency(10, 'exchange-123', 'AAPL', mockContext);
      }).not.toThrow();
    });
  });
});
