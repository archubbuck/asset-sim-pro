/**
 * Mock Authentication Service
 * 
 * Mock implementation for local development without Azure AD
 * Following ADR-020: Azure Authentication (Factory Pattern)
 * Following ADR-003: Local Development Strategy
 */
import { Injectable, signal, computed } from '@angular/core';
import { ClientPrincipal, ExchangeRole } from '@assetsim/shared/finance-models';
import { IAuthService } from './auth.interface';

@Injectable()
export class MockAuthService implements IAuthService {
  // State - Pre-authenticated mock user for local development
  #user = signal<ClientPrincipal | null>({
    userId: '00000000-0000-0000-0000-000000000001',
    userDetails: 'dev.user@assetsim.local',
    identityProvider: 'mock',
    userRoles: [ExchangeRole.RiskManager, ExchangeRole.PortfolioManager, ExchangeRole.Analyst]
  });

  // Selectors
  public readonly user = this.#user.asReadonly();
  public readonly isAuthenticated = computed(() => !!this.#user());
  public readonly roles = computed(() => this.#user()?.userRoles ?? []);

  /**
   * Mock session check - immediately resolves with mock user
   * No actual HTTP call is made
   */
  public async checkSession(): Promise<void> {
    // Already authenticated with mock user
    console.log('[MockAuthService] Using mock authenticated user for local development');
    return Promise.resolve();
  }

  /**
   * Mock login - logs to console only
   * No redirect occurs in local development
   */
  public login(): void {
    console.log('[MockAuthService] Mock login called - user already authenticated in local mode');
  }

  /**
   * Mock logout - clears mock user
   */
  public logout(): void {
    console.log('[MockAuthService] Mock logout called - clearing mock user');
    this.#user.set(null);
  }

  /**
   * Check if user has specific role
   * @param role - Role name to check
   */
  public hasRole(role: string): boolean {
    return this.roles().includes(role);
  }
}
