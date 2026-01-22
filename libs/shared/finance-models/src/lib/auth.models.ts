/**
 * Authentication Models for AssetSim Pro
 * 
 * Based on ADR-020: Azure Authentication
 * Defines types for Azure Static Web Apps authentication
 */

/**
 * Exchange Role enum for RBAC
 * Maps to ExchangeRoles table in database (ADR-002)
 */
export enum ExchangeRole {
  RiskManager = 'RiskManager',
  PortfolioManager = 'PortfolioManager',
  Analyst = 'Analyst'
}

/**
 * Client Principal returned from Azure Static Web Apps /.auth/me endpoint
 * Represents authenticated user information
 */
export interface ClientPrincipal {
  /**
   * Azure Entra ID Object ID (GUID)
   */
  userId: string;

  /**
   * User's email or username from identity provider
   */
  userDetails: string;

  /**
   * Identity provider (e.g., 'aad' for Azure Active Directory)
   */
  identityProvider: string;

  /**
   * Array of role names assigned to user
   * These map to ExchangeRole enum values
   */
  userRoles: string[];
}

/**
 * Authentication response from /.auth/me endpoint
 * Azure Static Web Apps standard response format
 */
export interface AuthResponse {
  /**
   * Client principal object if user is authenticated
   * null if user is anonymous/not logged in
   */
  clientPrincipal: ClientPrincipal | null;
}
