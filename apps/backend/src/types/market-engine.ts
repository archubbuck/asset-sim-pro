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

/**
 * Market engine configuration schema.
 *
 * Rationale for validation ranges:
 * - tickIntervalMs (100ms–60s)
 *   - Minimum 100ms:
 *     - Prevents excessively high-frequency timer triggers that could overwhelm Azure Functions,
 *       SignalR broadcasts, or downstream Azure SQL writes.
 *     - Aligns with ADR-006 guidance that real-time market data streams are typically throttled
 *       to 100–500ms to avoid UI and backend saturation.
 *   - Maximum 60s:
 *     - Ensures the market engine still behaves as a "real-time" simulator rather than a
 *       batch process, with at least one tick per minute.
 *     - Matches common cron/Timer trigger granularity for second-level updates in training
 *       scenarios (e.g., intraday strategy exercises).
 *
 * - volatility (0.001–1.0)
 *   - Interpreted as a 0–1 scalar applied to price-move calculations (e.g., as a standard
 *     deviation or percentage move factor in the pricing model).
 *   - 0.001 (~0.1%) represents a very stable market regime (e.g., highly liquid large-cap
 *     equities in calm conditions).
 *   - 1.0 (~100%) represents an extreme or crisis regime where prices can move dramatically
 *     between ticks (used in stress-testing and tail-risk training).
 *
 * These bounds are chosen as safe global limits for the simulator across asset classes and
 * exchanges. More specific behavior for particular markets or instruments should be modeled
 * by per-exchange or per-asset multipliers in the pricing logic, while this schema enforces
 * reasonable, documented limits at the configuration/API boundary.
 */
export const MarketEngineConfigSchema = z.object({
  exchangeId: z.string().uuid(),
  tickIntervalMs: z
    .number()
    .int()
    .positive()
    .min(100)
    .max(60000), // Engine tick interval in milliseconds (100ms min for performance, 60s max for real-time behavior)
  volatility: z
    .number()
    .positive()
    .min(0.001)
    .max(1.0), // Dimensionless volatility scalar (0.001 ≈ 0.1% moves, 1.0 ≈ 100% extreme volatility)
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
