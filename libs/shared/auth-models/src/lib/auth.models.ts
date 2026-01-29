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
   * Array of application role names assigned to the user.
   * 
   * These are NOT raw Azure Entra ID (Azure AD) roles or group IDs. The
   * authentication pipeline (see ADR-020) is responsible for translating
   * Azure AD roles/groups into application roles and normalizing them to
   * match the string values of the {@link ExchangeRole} enum.
   * 
   * In other words, each entry in this array should be a string equal to one
   * of the ExchangeRole values (e.g. "RiskManager", "PortfolioManager",
   * "Analyst"), allowing downstream code to treat these as ExchangeRole
   * names while keeping the transport type as string[].
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
