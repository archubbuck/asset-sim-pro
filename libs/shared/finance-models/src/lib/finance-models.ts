/**
 * Finance Models for AssetSim Pro
 * 
 * Based on ADR-021: Feature Flag Engine
 * Defines types for exchange configuration and feature flags
 */

/**
 * Exchange Configuration Interface
 * Risk Managers configure simulation rules via ExchangeConfig
 */
export interface ExchangeConfig {
  /**
   * Initial Assets Under Management (AUM) in USD
   * Default: 10,000,000
   */
  initialAum: number;

  /**
   * Commission in basis points (1 bp = 0.01%)
   * Default: 5 bps
   */
  commissionBps: number;

  /**
   * Whether margin trading is allowed
   * Default: true
   */
  allowMargin: boolean;

  /**
   * Market volatility multiplier
   * 1.0 = normal volatility, >1.0 = higher volatility
   * Default: 1.0
   */
  volatilityIndex: number;

  /**
   * Dashboard widget layout configuration
   * Array of widget identifiers to display
   */
  dashboardLayout: string[];
}

/**
 * Feature flag key-value pairs
 * Keys are feature identifiers, values are boolean flags
 */
export type ExchangeFeatureFlags = Record<string, boolean>;

/**
 * Feature Flag Response from API
 * Contains both feature flags and exchange configuration
 */
export interface FeatureFlagResponse {
  /**
   * Feature flags for conditional feature enablement
   */
  flags: ExchangeFeatureFlags;

  /**
   * Exchange configuration for simulation rules
   */
  configuration: ExchangeConfig;
}

/**
 * Price Update Event
 * Real-time price update broadcast from backend SignalR
 * Matches backend PriceUpdateEvent from market-engine.ts
 */
export interface PriceUpdateEvent {
  /**
   * Exchange ID that generated this price update
   */
  exchangeId: string;

  /**
   * Trading symbol (e.g., 'AAPL', 'MSFT')
   */
  symbol: string;

  /**
   * Current price
   */
  price: number;

  /**
   * Absolute price change from previous tick
   */
  change: number;

  /**
   * Percentage price change from previous tick
   */
  changePercent: number;

  /**
   * Trading volume
   */
  volume: number;

  /**
   * ISO 8601 timestamp
   */
  timestamp: string;
}

export function financeModels(): string {
  return 'finance-models';
}
