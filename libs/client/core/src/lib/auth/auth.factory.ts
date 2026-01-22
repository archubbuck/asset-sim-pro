/**
 * AuthService Factory
 * 
 * Factory function for providing appropriate authentication service
 * Uses environment detection to switch between real Azure AD and mock auth
 * Following ADR-020: Azure Authentication (Factory Pattern for Local Development)
 */
import { Provider, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IAuthService } from './auth.interface';
import { AzureAuthService } from './azure-auth.service';
import { MockAuthService } from './mock-auth.service';
import { LoggerService } from '../logger/logger.service';

/**
 * Abstract class for AuthService used as a DI token
 * Use this abstract class as the DI token when injecting the authentication service
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
 * Determines whether to use real Azure AD or mock authentication based on
 * hostname detection (localhost and loopback addresses use mock auth,
 * otherwise Azure AD is used).
 * 
 * @returns AzureAuthService or MockAuthService instance
 */
export function authServiceFactory(): IAuthService {
  const logger = inject(LoggerService);
  
  // Check if we're in local development based on hostname
  // Supports: localhost, 127.0.0.1, 0.0.0.0, and IPv6 localhost (::1)
  const useMockAuth =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0' ||
      window.location.hostname === '::1');

  if (useMockAuth) {
    logger.logTrace('AuthFactory: Using MockAuthService for local development');
    // MockAuthService has no dependencies, can be instantiated directly
    return new MockAuthService();
  } else {
    logger.logTrace('AuthFactory: Using AzureAuthService for production');
    // AzureAuthService needs HttpClient and LoggerService from Angular DI
    // Use inject() to get dependencies from the current injection context
    const http = inject(HttpClient);
    
    // Create service instance with constructor injection
    return new AzureAuthService(http, logger);
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
