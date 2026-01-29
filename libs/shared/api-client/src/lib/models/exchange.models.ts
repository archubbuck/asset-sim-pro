/**
 * Exchange API Request and Response Models
 * 
 * These models align with backend types in apps/backend/src/types/exchange.ts
 * and shared finance models in @assetsim/shared/finance-models
 */

/**
 * Request body for creating a new exchange
 */
export interface CreateExchangeRequest {
  name: string;
}

/**
 * Response from creating or retrieving an exchange
 */
export interface ExchangeResponse {
  exchangeId: string;
  name: string;
  createdAt: string;
  createdBy: string;
}
