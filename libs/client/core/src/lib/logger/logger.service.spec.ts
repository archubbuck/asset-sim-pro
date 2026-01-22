import { TestBed } from '@angular/core/testing';
import { LoggerService } from './logger.service';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

// Mock Application Insights
jest.mock('@microsoft/applicationinsights-web');

describe('LoggerService', () => {
  let service: LoggerService;
  let mockAppInsights: jest.Mocked<ApplicationInsights>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset process.env
    delete process.env['APP_INSIGHTS_CONNECTION_STRING'];

    // Create mock ApplicationInsights instance
    mockAppInsights = {
      loadAppInsights: jest.fn(),
      trackEvent: jest.fn(),
      trackTrace: jest.fn(),
      trackException: jest.fn(),
    } as any;

    // Mock the ApplicationInsights constructor
    (ApplicationInsights as jest.MockedClass<typeof ApplicationInsights>).mockImplementation(
      () => mockAppInsights
    );
  });

  describe('Initialization without connection string', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({});
      service = TestBed.inject(LoggerService);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should not initialize Application Insights when connection string is empty', () => {
      expect(mockAppInsights.loadAppInsights).not.toHaveBeenCalled();
    });

    it('should not log events when disabled', () => {
      service.logEvent('TestEvent', { key: 'value' });
      expect(mockAppInsights.trackEvent).not.toHaveBeenCalled();
    });

    it('should not log traces when disabled', () => {
      service.logTrace('Test trace message', { key: 'value' });
      expect(mockAppInsights.trackTrace).not.toHaveBeenCalled();
    });

    it('should fallback to console.error for exceptions when disabled', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Test error');
      
      service.logException(testError);
      
      expect(mockAppInsights.trackException).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(testError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Initialization with connection string', () => {
    beforeEach(() => {
      process.env['APP_INSIGHTS_CONNECTION_STRING'] = 'InstrumentationKey=test-key;IngestionEndpoint=https://test.applicationinsights.azure.com/';
      
      TestBed.configureTestingModule({});
      service = TestBed.inject(LoggerService);
    });

    it('should initialize Application Insights with correct configuration', () => {
      expect(ApplicationInsights).toHaveBeenCalledWith({
        config: {
          connectionString: 'InstrumentationKey=test-key;IngestionEndpoint=https://test.applicationinsights.azure.com/',
          enableAutoRouteTracking: true,
          disableInstrumentationKeyValidation: true,
          enableCorsCorrelation: true
        }
      });
    });

    it('should call loadAppInsights when connection string is provided', () => {
      expect(mockAppInsights.loadAppInsights).toHaveBeenCalled();
    });

    it('should log events when enabled', () => {
      const eventName = 'UserAction';
      const properties = { userId: '123', action: 'click' };
      
      service.logEvent(eventName, properties);
      
      expect(mockAppInsights.trackEvent).toHaveBeenCalledWith(
        { name: eventName },
        properties
      );
    });

    it('should log traces when enabled', () => {
      const message = 'Test trace message';
      const properties = { context: 'test' };
      
      service.logTrace(message, properties);
      
      expect(mockAppInsights.trackTrace).toHaveBeenCalledWith(
        { message },
        properties
      );
    });

    it('should log exceptions when enabled', () => {
      const testError = new Error('Test error');
      const severityLevel = 3;
      
      service.logException(testError, severityLevel);
      
      expect(mockAppInsights.trackException).toHaveBeenCalledWith({
        exception: testError,
        severityLevel
      });
    });

    it('should log exceptions without severity level', () => {
      const testError = new Error('Test error without severity');
      
      service.logException(testError);
      
      expect(mockAppInsights.trackException).toHaveBeenCalledWith({
        exception: testError,
        severityLevel: undefined
      });
    });

    it('should log events without properties', () => {
      const eventName = 'SimpleEvent';
      
      service.logEvent(eventName);
      
      expect(mockAppInsights.trackEvent).toHaveBeenCalledWith(
        { name: eventName },
        undefined
      );
    });

    it('should log traces without properties', () => {
      const message = 'Simple trace';
      
      service.logTrace(message);
      
      expect(mockAppInsights.trackTrace).toHaveBeenCalledWith(
        { message },
        undefined
      );
    });
  });

  describe('Initialization error handling', () => {
    beforeEach(() => {
      process.env['APP_INSIGHTS_CONNECTION_STRING'] = 'InstrumentationKey=test-key;IngestionEndpoint=https://test.applicationinsights.azure.com/';
      
      // Mock loadAppInsights to throw an error
      mockAppInsights.loadAppInsights.mockImplementation(() => {
        throw new Error('Failed to load Application Insights');
      });
    });

    it('should handle initialization errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      TestBed.configureTestingModule({});
      service = TestBed.inject(LoggerService);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize App Insights',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should not log when initialization fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      TestBed.configureTestingModule({});
      service = TestBed.inject(LoggerService);
      
      service.logEvent('TestEvent');
      
      expect(mockAppInsights.trackEvent).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});
