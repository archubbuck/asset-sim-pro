import { z } from 'zod';

/**
 * Market Engine Zod Schemas
 * Implements ADR-007: Validation for Market Engine Timer Triggers
 */

// Market tick schema for processing
export const MarketTickSchema = z.object({
  exchangeId: z.string().uuid(),
  symbol: z.string().min(1).max(20),
  timestamp: z.string().datetime(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative(),
});

export type MarketTick = z.infer<typeof MarketTickSchema>;

// Market engine configuration schema
export const MarketEngineConfigSchema = z.object({
  exchangeId: z.string().uuid(),
  tickIntervalMs: z.number().int().positive().min(100).max(60000), // 100ms to 60s
  volatility: z.number().positive().min(0.001).max(1.0), // 0.1% to 100%
  enabled: z.boolean(),
});

export type MarketEngineConfig = z.infer<typeof MarketEngineConfigSchema>;

// Order matching result schema
export const OrderMatchResultSchema = z.object({
  orderId: z.string().uuid(),
  matchedQuantity: z.number().nonnegative(),
  matchedPrice: z.number().positive().optional(),
  remainingQuantity: z.number().nonnegative(),
  status: z.enum(['FILLED', 'PARTIAL', 'NO_MATCH']),
});

export type OrderMatchResult = z.infer<typeof OrderMatchResultSchema>;

// Market state for an exchange
export interface MarketState {
  exchangeId: string;
  symbols: string[];
  lastProcessedAt: string;
  activeOrderCount: number;
  tickCount: number;
}

// Price update event schema
export const PriceUpdateEventSchema = z.object({
  exchangeId: z.string().uuid(),
  symbol: z.string().min(1).max(20),
  price: z.number().positive(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number().nonnegative(),
  timestamp: z.string().datetime(),
});

export type PriceUpdateEvent = z.infer<typeof PriceUpdateEventSchema>;
