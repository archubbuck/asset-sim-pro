import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FeatureService } from './feature.service';
import { LoggerService } from '../logger/logger.service';
import { FeatureFlagResponse } from '@assetsim/shared/finance-models';

describe('FeatureService', () => {
  let service: FeatureService;
  let httpMock: HttpTestingController;
  let mockLogger: jest.Mocked<LoggerService>;

  const mockFeatureResponse: FeatureFlagResponse = {
    flags: {
      'advanced-charts': true,
      'margin-trading': false,
      'real-time-data': true
    },
    configuration: {
      initialAum: 5000000,
      commissionBps: 10,
      allowMargin: false,
      volatilityIndex: 1.5,
      dashboardLayout: ['portfolio', 'risk-metrics', 'orders']
    }
  };

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      logEvent: jest.fn(),
      logTrace: jest.fn(),
      logException: jest.fn()
    } as unknown as jest.Mocked<LoggerService>;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FeatureService,
        { provide: LoggerService, useValue: mockLogger }
      ]
    });

    service = TestBed.inject(FeatureService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify no outstanding HTTP requests
    httpMock.verify();
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Default State', () => {
    it('should have default empty flags', () => {
      const flags = service.flags();
      expect(flags).toEqual({});
    });

    it('should have default configuration values', () => {
      const config = service.config();
      expect(config).toEqual({
        initialAum: 10000000,
        commissionBps: 5,
        allowMargin: true,
        volatilityIndex: 1.0,
        dashboardLayout: ['market-status', 'holdings-blotter']
      });
    });
  });

  describe('loadFeatures()', () => {
    it('should fetch features from API endpoint', async () => {
      const loadPromise = service.loadFeatures();

      const req = httpMock.expectOne('/api/v1/exchange/rules');
      expect(req.request.method).toBe('GET');
      
      req.flush(mockFeatureResponse);
      
      const result = await loadPromise;
      expect(result).toEqual(mockFeatureResponse);
    });

    it('should update flags signal after successful load', async () => {
      const loadPromise = service.loadFeatures();

      const req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush(mockFeatureResponse);
      
      await loadPromise;

      const flags = service.flags();
      expect(flags).toEqual(mockFeatureResponse.flags);
      expect(flags['advanced-charts']).toBe(true);
      expect(flags['margin-trading']).toBe(false);
      expect(flags['real-time-data']).toBe(true);
    });

    it('should update config signal after successful load', async () => {
      const loadPromise = service.loadFeatures();

      const req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush(mockFeatureResponse);
      
      await loadPromise;

      const config = service.config();
      expect(config).toEqual(mockFeatureResponse.configuration);
      expect(config.initialAum).toBe(5000000);
      expect(config.commissionBps).toBe(10);
      expect(config.allowMargin).toBe(false);
      expect(config.volatilityIndex).toBe(1.5);
      expect(config.dashboardLayout).toEqual(['portfolio', 'risk-metrics', 'orders']);
    });

    it('should log ExchangeRulesLoaded event with volatility', async () => {
      const loadPromise = service.loadFeatures();

      const req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush(mockFeatureResponse);
      
      await loadPromise;

      expect(mockLogger.logEvent).toHaveBeenCalledWith(
        'ExchangeRulesLoaded',
        { volatility: 1.5 }
      );
    });

    it('should handle API errors gracefully', async () => {
      const loadPromise = service.loadFeatures();

      const req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush('API Error', { status: 500, statusText: 'Internal Server Error' });

      await expect(loadPromise).rejects.toBeDefined();
    });

    it('should handle network errors', async () => {
      const loadPromise = service.loadFeatures();

      const req = httpMock.expectOne('/api/v1/exchange/rules');
      req.error(new ProgressEvent('Network error'));

      await expect(loadPromise).rejects.toBeDefined();
    });

    it('should update state atomically on successful load', async () => {
      const loadPromise = service.loadFeatures();

      const req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush(mockFeatureResponse);
      
      await loadPromise;

      // Verify both flags and config are updated together
      expect(service.flags()).toBe(mockFeatureResponse.flags);
      expect(service.config()).toBe(mockFeatureResponse.configuration);
    });
  });

  describe('isEnabled()', () => {
    beforeEach(async () => {
      const loadPromise = service.loadFeatures();
      const req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush(mockFeatureResponse);
      await loadPromise;
    });

    it('should return true for enabled features', () => {
      expect(service.isEnabled('advanced-charts')).toBe(true);
      expect(service.isEnabled('real-time-data')).toBe(true);
    });

    it('should return false for disabled features', () => {
      expect(service.isEnabled('margin-trading')).toBe(false);
    });

    it('should return false for non-existent features', () => {
      expect(service.isEnabled('non-existent-feature')).toBe(false);
    });

    it('should return false for undefined flag keys', () => {
      expect(service.isEnabled('')).toBe(false);
    });

    it('should handle special characters in feature keys', () => {
      // Load features with special characters
      const specialResponse: FeatureFlagResponse = {
        flags: {
          'feature-with-dashes': true,
          'feature_with_underscores': false,
          'feature.with.dots': true
        },
        configuration: mockFeatureResponse.configuration
      };

      const loadPromise = service.loadFeatures();
      const req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush(specialResponse);

      expect(service.isEnabled('feature-with-dashes')).toBe(true);
      expect(service.isEnabled('feature_with_underscores')).toBe(false);
      expect(service.isEnabled('feature.with.dots')).toBe(true);
    });
  });

  describe('Reactive Signal Updates', () => {
    it('should trigger computed signal updates when state changes', async () => {
      // Initial state
      let flagsUpdateCount = 0;
      let configUpdateCount = 0;

      // Track updates using effect simulation
      const initialFlags = service.flags();
      const initialConfig = service.config();
      
      expect(initialFlags).toEqual({});
      expect(initialConfig.initialAum).toBe(10000000);

      // Load new features
      const loadPromise = service.loadFeatures();
      const req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush(mockFeatureResponse);
      await loadPromise;

      // Verify signals updated
      const updatedFlags = service.flags();
      const updatedConfig = service.config();
      
      expect(updatedFlags).not.toBe(initialFlags);
      expect(updatedConfig).not.toBe(initialConfig);
      expect(updatedFlags).toEqual(mockFeatureResponse.flags);
      expect(updatedConfig).toEqual(mockFeatureResponse.configuration);
    });

    it('should allow multiple loads and state updates', async () => {
      // First load
      let loadPromise = service.loadFeatures();
      let req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush(mockFeatureResponse);
      await loadPromise;

      expect(service.config().volatilityIndex).toBe(1.5);

      // Second load with different data
      const updatedResponse: FeatureFlagResponse = {
        flags: { 'new-feature': true },
        configuration: {
          ...mockFeatureResponse.configuration,
          volatilityIndex: 2.0
        }
      };

      loadPromise = service.loadFeatures();
      req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush(updatedResponse);
      await loadPromise;

      expect(service.config().volatilityIndex).toBe(2.0);
      expect(service.isEnabled('new-feature')).toBe(true);
      expect(mockLogger.logEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty flags object', async () => {
      const emptyFlagsResponse: FeatureFlagResponse = {
        flags: {},
        configuration: mockFeatureResponse.configuration
      };

      const loadPromise = service.loadFeatures();
      const req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush(emptyFlagsResponse);
      await loadPromise;

      expect(service.flags()).toEqual({});
      expect(service.isEnabled('any-feature')).toBe(false);
    });

    it('should handle null/undefined flag values correctly', async () => {
      const nullFlagsResponse: FeatureFlagResponse = {
        flags: {
          'null-flag': null as any,
          'undefined-flag': undefined as any
        },
        configuration: mockFeatureResponse.configuration
      };

      const loadPromise = service.loadFeatures();
      const req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush(nullFlagsResponse);
      await loadPromise;

      // Null/undefined should be treated as false
      expect(service.isEnabled('null-flag')).toBe(false);
      expect(service.isEnabled('undefined-flag')).toBe(false);
    });

    it('should handle very large configuration values', async () => {
      const largeValuesResponse: FeatureFlagResponse = {
        flags: mockFeatureResponse.flags,
        configuration: {
          initialAum: Number.MAX_SAFE_INTEGER,
          commissionBps: 999999,
          allowMargin: true,
          volatilityIndex: 100.0,
          dashboardLayout: Array(100).fill('widget')
        }
      };

      const loadPromise = service.loadFeatures();
      const req = httpMock.expectOne('/api/v1/exchange/rules');
      req.flush(largeValuesResponse);
      await loadPromise;

      const config = service.config();
      expect(config.initialAum).toBe(Number.MAX_SAFE_INTEGER);
      expect(config.dashboardLayout.length).toBe(100);
    });
  });
});
