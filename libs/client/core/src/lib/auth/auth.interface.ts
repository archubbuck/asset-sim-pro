/**
 * IAuthService Interface
 * 
 * Defines the contract for authentication services in AssetSim Pro
 * This interface enables factory pattern for switching between real and mock auth
 * Following ADR-020: Azure Authentication
 */
import { Signal } from '@angular/core';
import { ClientPrincipal } from '@assetsim/shared/auth-models';

export interface IAuthService {
  /**
   * Current authenticated user (readonly signal)
   */
  readonly user: Signal<ClientPrincipal | null>;

  /**
   * Computed signal indicating if user is authenticated
   */
  readonly isAuthenticated: Signal<boolean>;

  /**
   * Computed signal returning user's roles
   */
  readonly roles: Signal<string[]>;

  /**
   * Check and restore session from /.auth/me endpoint
   */
  checkSession(): Promise<void>;

  /**
   * Initiate login flow (redirects to Azure AD)
   */
  login(): void;

  /**
   * Logout user and clear session
   */
  logout(): void;

  /**
   * Check if user has specific role
   * @param role - Role name to check
   */
  hasRole(role: string): boolean;
}
