/**
 * Trading Configuration Models
 * 
 * Configuration for trading components including demo/stub data settings
 */
import { InjectionToken } from '@angular/core';

/**
 * Configuration for stub/demo data in trading components
 */
export interface TradingStubConfig {
  /**
   * Exchange ID to use for stub data and API calls
   */
  exchangeId: string;

  /**
   * Portfolio ID to use for stub data
   */
  portfolioId: string;

  /**
   * Order ID prefix for generating stub order IDs
   * Actual IDs will be generated as {prefix}-{index}
   */
  orderIdPrefix?: string;
}

/**
 * Default stub configuration for demo/development mode
 * Uses placeholder UUID values for backend Zod validation compatibility
 */
export const DEFAULT_TRADING_STUB_CONFIG: TradingStubConfig = {
  exchangeId: '00000000-0000-0000-0000-000000000000',
  portfolioId: '00000000-0000-0000-0000-000000000001',
  orderIdPrefix: 'demo-order'
};

/**
 * Injection token for trading stub configuration
 */
export const TRADING_STUB_CONFIG = new InjectionToken<TradingStubConfig>(
  'TRADING_STUB_CONFIG',
  {
    providedIn: 'root',
    factory: () => DEFAULT_TRADING_STUB_CONFIG
  }
);
