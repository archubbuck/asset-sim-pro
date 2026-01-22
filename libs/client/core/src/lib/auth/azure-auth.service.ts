/**
 * Azure Authentication Service
 * 
 * Real implementation of authentication using Azure Static Web Apps and Entra ID
 * Following ADR-020: Azure Authentication
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthResponse, ClientPrincipal } from '@assetsim/shared/finance-models';
import { LoggerService } from '../logger/logger.service';
import { IAuthService } from './auth.interface';

@Injectable()
export class AzureAuthService implements IAuthService {
  // Dependencies can be injected via constructor or set by factory
  // Using public properties to allow factory to set them
  public http!: HttpClient;
  public logger!: LoggerService;

  constructor() {
    // Try to inject dependencies if in Angular injection context
    try {
      this.http = inject(HttpClient);
      this.logger = inject(LoggerService);
    } catch {
      // Dependencies will be set by factory if not in injection context
    }
  }

  // State
  #user = signal<ClientPrincipal | null>(null);

  // Selectors
  public readonly user = this.#user.asReadonly();
  public readonly isAuthenticated = computed(() => !!this.#user());
  public readonly roles = computed(() => this.#user()?.userRoles ?? []);

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
    } catch (e) {
      this.logger.logTrace('User not logged in - Anonymous session');
      this.#user.set(null);
    }
  }

  /**
   * Redirect to Azure AD login
   * Uses Azure Static Web Apps built-in authentication
   */
  public login(): void {
    window.location.href = '/.auth/login/aad?post_login_redirect_uri=/dashboard';
  }

  /**
   * Logout user and redirect to home page
   * Clears Azure Static Web Apps session
   */
  public logout(): void {
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
  }

  /**
   * Check if user has specific role
   * @param role - Role name to check (e.g., 'RiskManager', 'Analyst')
   */
  public hasRole(role: string): boolean {
    return this.roles().includes(role);
  }
}
