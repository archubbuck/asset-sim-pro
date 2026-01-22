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

    it('should handle HTTP errors gracefully', async () => {
      mockHttpClient.get.mockReturnValue(throwError(() => new Error('Network error')));

      await service.checkSession();

      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(mockLogger.logTrace).toHaveBeenCalledWith('User not logged in - Anonymous session');
    });
  });

  describe('login', () => {
    it('should have a login method', () => {
      // Login triggers a full page redirect to Azure AD
      // This cannot be meaningfully tested in a unit test environment
      // Integration tests should verify the actual redirect behavior
      expect(service.login).toBeDefined();
      expect(typeof service.login).toBe('function');
    });
  });

  describe('logout', () => {
    it('should have a logout method', () => {
      // Logout triggers a full page redirect 
      // This cannot be meaningfully tested in a unit test environment
      // Integration tests should verify the actual redirect behavior
      expect(service.logout).toBeDefined();
      expect(typeof service.logout).toBe('function');
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
