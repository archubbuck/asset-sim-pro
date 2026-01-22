/**
 * AuthService Factory Unit Tests
 */
import { authServiceFactory, provideAuthService, AuthService } from './auth.factory';
import { MockAuthService } from './mock-auth.service';

describe('authServiceFactory', () => {
  beforeEach(() => {
    // Mock LoggerService methods to avoid actual logging during tests
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Environment-based service selection', () => {
    it('should return MockAuthService when hostname is localhost (JSDOM default)', () => {
      // In JSDOM test environment, window.location.hostname defaults to 'localhost'
      // This test verifies the factory works in the test environment
      const service = authServiceFactory();

      expect(service).toBeInstanceOf(MockAuthService);
    });
  });

  describe('Hostname detection for local development', () => {
    it('should use hostname detection for environment selection', () => {
      const service = authServiceFactory();

      // In JSDOM (test environment), hostname is 'localhost', so MockAuthService is returned
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
