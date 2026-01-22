/**
 * AuthService Factory
 * 
 * Factory function for providing appropriate authentication service
 * Uses environment detection to switch between real Azure AD and mock auth
 * Following ADR-020: Azure Authentication (Factory Pattern for Local Development)
 */
import { Provider } from '@angular/core';
import { IAuthService } from './auth.interface';
import { AzureAuthService } from './azure-auth.service';
import { MockAuthService } from './mock-auth.service';

/**
 * InjectionToken for AuthService
 * Use this token when injecting the authentication service
 */
export abstract class AuthService implements IAuthService {
  abstract readonly user: IAuthService['user'];
  abstract readonly isAuthenticated: IAuthService['isAuthenticated'];
  abstract readonly roles: IAuthService['roles'];
  abstract checkSession(): Promise<void>;
  abstract login(): void;
  abstract logout(): void;
  abstract hasRole(role: string): boolean;
}

/**
 * Factory function to create appropriate auth service
 * 
 * Determines whether to use real Azure AD or mock authentication based on:
 * 1. Environment variable USE_MOCK_AUTH (for build-time configuration)
 * 2. Hostname detection (localhost = mock, otherwise = real)
 * 
 * @returns AzureAuthService or MockAuthService instance
 */
export function authServiceFactory(): IAuthService {
  // Check if we're in local development
  const useMockAuth = process.env['USE_MOCK_AUTH'] === 'true' || 
                      (typeof window !== 'undefined' && 
                       (window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1'));

  if (useMockAuth) {
    console.log('[AuthFactory] Using MockAuthService for local development');
    return new MockAuthService();
  } else {
    console.log('[AuthFactory] Using AzureAuthService for production');
    return new AzureAuthService();
  }
}

/**
 * Provider configuration for AuthService
 * Use this in your app.config.ts providers array
 * 
 * Example:
 * ```typescript
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideAuthService(),
 *     // ... other providers
 *   ]
 * };
 * ```
 */
export function provideAuthService(): Provider {
  return {
    provide: AuthService,
    useFactory: authServiceFactory
  };
}
