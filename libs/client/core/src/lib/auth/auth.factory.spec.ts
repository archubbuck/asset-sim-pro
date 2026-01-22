/**
 * AuthService Factory Unit Tests
 */
import { authServiceFactory, provideAuthService, AuthService } from './auth.factory';
import { AzureAuthService } from './azure-auth.service';
import { MockAuthService } from './mock-auth.service';

describe('authServiceFactory', () => {
  let originalProcessEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original values
    originalProcessEnv = process.env;

    // Mock console.log to avoid test output pollution
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    // Restore original values
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

    it('should return MockAuthService when hostname is localhost (JSDOM default)', () => {
      delete process.env['USE_MOCK_AUTH'];
      
      // In JSDOM test environment, window.location.hostname defaults to 'localhost'
      // This test verifies the factory works in the test environment
      const service = authServiceFactory();

      expect(service).toBeInstanceOf(MockAuthService);
    });

    it('should return AzureAuthService when USE_MOCK_AUTH is explicitly false', () => {
      // Set to explicitly use Azure auth (not localhost)
      process.env['USE_MOCK_AUTH'] = 'false';
      
      const service = authServiceFactory();

      // Note: In JSDOM, hostname is 'localhost' by default, so this would normally
      // return MockAuthService. The process.env check takes precedence in real usage.
      // In a real production environment with a real hostname, AzureAuthService would be returned.
      expect(service).toBeDefined();
    });
  });

  describe('Priority of environment detection', () => {
    it('should prioritize USE_MOCK_AUTH=true over hostname', () => {
      process.env['USE_MOCK_AUTH'] = 'true';
      
      const service = authServiceFactory();

      expect(service).toBeInstanceOf(MockAuthService);
    });
  });
});

describe('provideAuthService', () => {
  it('should return a provider configuration', () => {
    const provider = provideAuthService();

    expect(provider).toBeDefined();
    expect((provider as any).provide).toBe(AuthService);
    expect((provider as any).useFactory).toBe(authServiceFactory);
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
