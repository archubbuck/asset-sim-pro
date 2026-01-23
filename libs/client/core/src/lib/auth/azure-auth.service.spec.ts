/**
 * AzureAuthService Unit Tests
 */
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AzureAuthService } from './azure-auth.service';
import { LoggerService } from '../logger/logger.service';
import { AuthResponse, ClientPrincipal, ExchangeRole } from '@assetsim/shared/finance-models';

describe('AzureAuthService', () => {
  let service: AzureAuthService;
  let mockHttpClient: jest.Mocked<HttpClient>;
  let mockLogger: jest.Mocked<LoggerService>;

  const mockClientPrincipal: ClientPrincipal = {
    userId: 'test-user-id-123',
    userDetails: 'test.user@example.com',
    identityProvider: 'aad',
    userRoles: [ExchangeRole.RiskManager, ExchangeRole.Analyst]
  };

  beforeEach(() => {
    // Create mocks
    mockHttpClient = {
      get: jest.fn()
    } as unknown as jest.Mocked<HttpClient>;

    mockLogger = {
      logEvent: jest.fn(),
      logTrace: jest.fn(),
      logException: jest.fn()
    } as unknown as jest.Mocked<LoggerService>;

    TestBed.configureTestingModule({
      providers: [
        AzureAuthService,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: LoggerService, useValue: mockLogger }
      ]
    });

    service = TestBed.inject(AzureAuthService);
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null user', () => {
      expect(service.user()).toBeNull();
    });

    it('should have isAuthenticated false initially', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should have empty roles initially', () => {
      expect(service.roles()).toEqual([]);
    });
  });

  describe('checkSession', () => {
    it('should restore session when user is authenticated', async () => {
      const mockResponse: AuthResponse = {
        clientPrincipal: mockClientPrincipal
      };

      mockHttpClient.get.mockReturnValue(of(mockResponse));

      await service.checkSession();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/.auth/me');
      expect(service.user()).toEqual(mockClientPrincipal);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.roles()).toEqual([ExchangeRole.RiskManager, ExchangeRole.Analyst]);
      expect(mockLogger.logEvent).toHaveBeenCalledWith('SessionRestored', {
        userId: 'test-user-id-123'
      });
    });

    it('should set user to null when not authenticated', async () => {
      const mockResponse: AuthResponse = {
        clientPrincipal: null
      };

      mockHttpClient.get.mockReturnValue(of(mockResponse));

      await service.checkSession();

      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(mockLogger.logEvent).not.toHaveBeenCalled();
    });

    it('should handle HTTP errors gracefully and log security event', async () => {
      mockHttpClient.get.mockReturnValue(throwError(() => new Error('Network error')));

      await service.checkSession();

      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(mockLogger.logEvent).toHaveBeenCalledWith('SessionCheckFailed', {
        reason: 'Unexpected error during session check',
        error: 'Network error'
      });
      expect(mockLogger.logTrace).toHaveBeenCalledWith('User not logged in - Anonymous session', {
        error: 'Network error'
      });
    });

    it('should not log SessionCheckFailed event for 401 errors', async () => {
      const mockError = { status: 401, message: 'Unauthorized' };
      mockHttpClient.get.mockReturnValue(throwError(() => mockError));

      await service.checkSession();

      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(mockLogger.logEvent).not.toHaveBeenCalled();
      expect(mockLogger.logTrace).toHaveBeenCalledWith('User not logged in - Anonymous session', {
        error: '[object Object]'
      });
    });

    it('should not log SessionCheckFailed event for 404 errors', async () => {
      const mockError = { status: 404, message: 'Not Found' };
      mockHttpClient.get.mockReturnValue(throwError(() => mockError));

      await service.checkSession();

      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(mockLogger.logEvent).not.toHaveBeenCalled();
      expect(mockLogger.logTrace).toHaveBeenCalledWith('User not logged in - Anonymous session', {
        error: '[object Object]'
      });
    });
  });

  describe('login', () => {
    it('should redirect to Azure AD login with correct URI', () => {
      const originalLocation = window.location;
      const mockLocation: Partial<Location> = {
        ...originalLocation,
        href: originalLocation.href
      };

      Object.defineProperty(window, 'location', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: mockLocation
      });

      try {
        service.login();
        expect(window.location.href).toBe('/.auth/login/aad?post_login_redirect_uri=/dashboard');
      } finally {
        Object.defineProperty(window, 'location', {
          configurable: true,
          enumerable: true,
          writable: true,
          value: originalLocation
        });
      }
    });
  });

  describe('logout', () => {
    it('should redirect to Azure logout with correct URI', () => {
      const originalLocation = window.location;
      const mockLocation: Partial<Location> = {
        ...originalLocation,
        href: originalLocation.href
      };

      Object.defineProperty(window, 'location', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: mockLocation
      });

      try {
        service.logout();
        expect(window.location.href).toBe('/.auth/logout?post_logout_redirect_uri=/');
      } finally {
        Object.defineProperty(window, 'location', {
          configurable: true,
          enumerable: true,
          writable: true,
          value: originalLocation
        });
      }
    });
  });

  describe('hasRole', () => {
    it('should return true if user has the specified role', async () => {
      const mockResponse: AuthResponse = {
        clientPrincipal: mockClientPrincipal
      };

      mockHttpClient.get.mockReturnValue(of(mockResponse));
      await service.checkSession();

      expect(service.hasRole(ExchangeRole.RiskManager)).toBe(true);
      expect(service.hasRole(ExchangeRole.Analyst)).toBe(true);
    });

    it('should return false if user does not have the specified role', async () => {
      const mockResponse: AuthResponse = {
        clientPrincipal: mockClientPrincipal
      };

      mockHttpClient.get.mockReturnValue(of(mockResponse));
      await service.checkSession();

      expect(service.hasRole(ExchangeRole.PortfolioManager)).toBe(false);
    });

    it('should return false if user is not authenticated', () => {
      expect(service.hasRole(ExchangeRole.RiskManager)).toBe(false);
    });
  });

  describe('Signals reactivity', () => {
    it('should update computed signals when user state changes', async () => {
      expect(service.isAuthenticated()).toBe(false);
      expect(service.roles()).toEqual([]);

      const mockResponse: AuthResponse = {
        clientPrincipal: mockClientPrincipal
      };

      mockHttpClient.get.mockReturnValue(of(mockResponse));
      await service.checkSession();

      expect(service.isAuthenticated()).toBe(true);
      expect(service.roles()).toEqual([ExchangeRole.RiskManager, ExchangeRole.Analyst]);
    });
  });
});
