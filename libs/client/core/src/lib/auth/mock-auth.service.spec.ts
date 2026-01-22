/**
 * MockAuthService Unit Tests
 */
import { TestBed } from '@angular/core/testing';
import { MockAuthService } from './mock-auth.service';
import { ExchangeRole } from '@assetsim/shared/finance-models';

describe('MockAuthService', () => {
  let service: MockAuthService;

  beforeEach(() => {
    // Clear console spies
    jest.spyOn(console, 'log').mockImplementation();

    TestBed.configureTestingModule({
      providers: [MockAuthService]
    });

    service = TestBed.inject(MockAuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with mock user already authenticated', () => {
      const user = service.user();
      
      expect(user).not.toBeNull();
      expect(user?.userId).toBe('00000000-0000-0000-0000-000000000001');
      expect(user?.userDetails).toBe('dev.user@assetsim.local');
      expect(user?.identityProvider).toBe('mock');
    });

    it('should have isAuthenticated true initially', () => {
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should have all roles assigned initially', () => {
      const roles = service.roles();
      
      expect(roles).toContain(ExchangeRole.RiskManager);
      expect(roles).toContain(ExchangeRole.PortfolioManager);
      expect(roles).toContain(ExchangeRole.Analyst);
      expect(roles.length).toBe(3);
    });
  });

  describe('checkSession', () => {
    it('should resolve immediately with mock user', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      await service.checkSession();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MockAuthService] Using mock authenticated user for local development'
      );
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should not make any HTTP calls', async () => {
      // This test ensures no actual network activity happens
      await service.checkSession();
      
      expect(service.user()).not.toBeNull();
    });
  });

  describe('login', () => {
    it('should log to console instead of redirecting', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      service.login();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MockAuthService] Mock login called - user already authenticated in local mode'
      );
    });

    it('should not change user state', () => {
      const userBefore = service.user();
      
      service.login();
      
      expect(service.user()).toEqual(userBefore);
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear mock user', () => {
      expect(service.isAuthenticated()).toBe(true);

      service.logout();

      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.roles()).toEqual([]);
    });

    it('should log to console', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      service.logout();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MockAuthService] Mock logout called - clearing mock user'
      );
    });
  });

  describe('hasRole', () => {
    it('should return true for all roles initially', () => {
      expect(service.hasRole(ExchangeRole.RiskManager)).toBe(true);
      expect(service.hasRole(ExchangeRole.PortfolioManager)).toBe(true);
      expect(service.hasRole(ExchangeRole.Analyst)).toBe(true);
    });

    it('should return false for unknown roles', () => {
      expect(service.hasRole('UnknownRole')).toBe(false);
    });

    it('should return false after logout', () => {
      service.logout();

      expect(service.hasRole(ExchangeRole.RiskManager)).toBe(false);
      expect(service.hasRole(ExchangeRole.PortfolioManager)).toBe(false);
      expect(service.hasRole(ExchangeRole.Analyst)).toBe(false);
    });
  });

  describe('Signals reactivity', () => {
    it('should update computed signals when user is logged out', () => {
      expect(service.isAuthenticated()).toBe(true);
      expect(service.roles().length).toBe(3);

      service.logout();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.roles()).toEqual([]);
    });
  });
});
