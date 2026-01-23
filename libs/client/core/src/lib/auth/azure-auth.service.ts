/**
 * Azure Authentication Service
 * 
 * Real implementation of authentication using Azure Static Web Apps and Entra ID
 * Following ADR-020: Azure Authentication
 */
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthResponse, ClientPrincipal } from '@assetsim/shared/finance-models';
import { LoggerService } from '../logger/logger.service';
import { IAuthService } from './auth.interface';

@Injectable()
export class AzureAuthService implements IAuthService {
  // State
  #user = signal<ClientPrincipal | null>(null);

  // Selectors
  public readonly user = this.#user.asReadonly();
  public readonly isAuthenticated = computed(() => !!this.#user());
  public readonly roles = computed(() => this.#user()?.userRoles ?? []);

  constructor(
    private readonly http: HttpClient,
    private readonly logger: LoggerService
  ) {}

  /**
   * Check session by calling Azure Static Web Apps /.auth/me endpoint
   * Restores user session if valid authentication exists
   */
  public async checkSession(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<AuthResponse>('/.auth/me'));
      this.#user.set(response.clientPrincipal);
      
      if (response.clientPrincipal) {
        this.logger.logEvent('SessionRestored', { userId: response.clientPrincipal.userId });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if this is a normal "not authenticated" case (401/404) vs actual error
      const isNormalUnauthenticated = 
        error && typeof error === 'object' && 'status' in error && 
        (error.status === 401 || error.status === 404);

      if (!isNormalUnauthenticated) {
        // Log security event only for actual errors, not normal unauthenticated state
        this.logger.logEvent('SessionCheckFailed', {
          reason: 'Unexpected error during session check',
          error: errorMessage
        });
      }

      this.logger.logTrace('User not logged in - Anonymous session', { 
        error: errorMessage 
      });
      this.#user.set(null);
    }
  }

  /**
   * Redirect to Azure AD login
   * Uses Azure Static Web Apps built-in authentication
   * Note: The post_login_redirect_uri is set to /dashboard as per ADR-020
   * This can be customized via Angular environment configuration at build time if needed
   */
  public login(): void {
    const redirectUri = '/dashboard';
    window.location.href = `/.auth/login/aad?post_login_redirect_uri=${redirectUri}`;
  }

  /**
   * Logout user and redirect to home page
   * Clears Azure Static Web Apps session
   * Note: The post_logout_redirect_uri is currently set to the application root ('/').
   *       To customize at runtime, prefer Angular environment config or a runtime config endpoint.
   */
  public logout(): void {
    const redirectUri = '/';
    window.location.href = `/.auth/logout?post_logout_redirect_uri=${redirectUri}`;
  }

  /**
   * Check if user has specific role
   * @param role - Role name to check (e.g., 'RiskManager', 'Analyst')
   */
  public hasRole(role: string): boolean {
    return this.roles().includes(role);
  }
}
