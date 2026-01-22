/**
 * AuthService Factory Unit Tests
 */
import { authServiceFactory, provideAuthService, AuthService } from './auth.factory';
import { AzureAuthService } from './azure-auth.service';
import { MockAuthService } from './mock-auth.service';

describe('authServiceFactory', () => {
  let originalLocation: Location;
  let originalProcessEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original values
    originalLocation = window.location;
    originalProcessEnv = process.env;

    // Mock console.log to avoid test output pollution
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    // Restore original values
    window.location = originalLocation;
    process.env = originalProcessEnv;
    jest.restoreAllMocks();
  });

  describe('Environment-based service selection', () => {
    it('should return MockAuthService when USE_MOCK_AUTH is true', () => {
      process.env['USE_MOCK_AUTH'] = 'true';

      const service = authServiceFactory();

      expect(service).toBeInstanceOf(MockAuthService);
      expect(console.log).toHaveBeenCalledWith(
        '[AuthFactory] Using MockAuthService for local development'
      );
    });

    it('should return MockAuthService when hostname is localhost', () => {
      delete process.env['USE_MOCK_AUTH'];
      
      // Mock window.location
      delete (window as any).location;
      window.location = {
        hostname: 'localhost'
      } as Location;

      const service = authServiceFactory();

      expect(service).toBeInstanceOf(MockAuthService);
    });

    it('should return MockAuthService when hostname is 127.0.0.1', () => {
      delete process.env['USE_MOCK_AUTH'];
      
      // Mock window.location
      delete (window as any).location;
      window.location = {
        hostname: '127.0.0.1'
      } as Location;

      const service = authServiceFactory();

      expect(service).toBeInstanceOf(MockAuthService);
    });

    it('should return AzureAuthService for production hostnames', () => {
      delete process.env['USE_MOCK_AUTH'];
      
      // Mock window.location
      delete (window as any).location;
      window.location = {
        hostname: 'assetsim.azurestaticapps.net'
      } as Location;

      const service = authServiceFactory();

      expect(service).toBeInstanceOf(AzureAuthService);
      expect(console.log).toHaveBeenCalledWith(
        '[AuthFactory] Using AzureAuthService for production'
      );
    });

    it('should return AzureAuthService for custom domain', () => {
      delete process.env['USE_MOCK_AUTH'];
      
      // Mock window.location
      delete (window as any).location;
      window.location = {
        hostname: 'app.assetsim.com'
      } as Location;

      const service = authServiceFactory();

      expect(service).toBeInstanceOf(AzureAuthService);
    });
  });

  describe('Priority of environment detection', () => {
    it('should prioritize USE_MOCK_AUTH over hostname detection', () => {
      process.env['USE_MOCK_AUTH'] = 'true';
      
      // Even with production hostname
      delete (window as any).location;
      window.location = {
        hostname: 'app.assetsim.com'
      } as Location;

      const service = authServiceFactory();

      expect(service).toBeInstanceOf(MockAuthService);
    });
  });
});

describe('provideAuthService', () => {
  it('should return a provider configuration', () => {
    const provider = provideAuthService();

    expect(provider).toBeDefined();
    expect(provider.provide).toBe(AuthService);
    expect(provider.useFactory).toBe(authServiceFactory);
  });
});

describe('AuthService abstract class', () => {
  it('should define the contract for authentication services', () => {
    // This test verifies the abstract class structure
    expect(AuthService).toBeDefined();
    
    // Create a test implementation
    class TestAuthService extends AuthService {
      user = null as any;
      isAuthenticated = null as any;
      roles = null as any;
      checkSession = jest.fn();
      login = jest.fn();
      logout = jest.fn();
      hasRole = jest.fn();
    }

    const testService = new TestAuthService();
    
    expect(testService).toBeInstanceOf(AuthService);
  });
});
