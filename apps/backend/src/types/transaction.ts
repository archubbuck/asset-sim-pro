import { z } from 'zod';

/**
 * Transaction API Zod Schemas
 * Implements ADR-007: Validation for Transaction API HTTP Triggers
 */

// Order side enum
export const OrderSideSchema = z.enum(['BUY', 'SELL']);
export type OrderSide = z.infer<typeof OrderSideSchema>;

// Order type enum
export const OrderTypeSchema = z.enum(['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT']);
export type OrderType = z.infer<typeof OrderTypeSchema>;

// Order status enum
export const OrderStatusSchema = z.enum(['PENDING', 'FILLED', 'PARTIAL', 'CANCELLED', 'REJECTED']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// Create order request schema with improved validation messages
export const CreateOrderSchema = z.object({
  exchangeId: z.string().uuid(),
  symbol: z.string().min(1).max(20),
  side: OrderSideSchema,
  orderType: OrderTypeSchema,
  quantity: z.number().positive(),
  price: z.number().positive().optional(), // Required for LIMIT orders
  stopPrice: z.number().positive().optional(), // Required for STOP orders
  portfolioId: z.string().uuid(),
}).superRefine((data, ctx) => {
  // LIMIT orders require price
  if (data.orderType === 'LIMIT' && !data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'LIMIT orders require a price field',
      path: ['price'],
    });
  }
  
  // STOP_LIMIT orders require both price and stopPrice
  if (data.orderType === 'STOP_LIMIT') {
    if (!data.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'STOP_LIMIT orders require a price field (limit price)',
        path: ['price'],
      });
    }
    if (!data.stopPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'STOP_LIMIT orders require a stopPrice field (trigger price)',
        path: ['stopPrice'],
      });
    }
  }
  
  // STOP orders require stopPrice
  if (data.orderType === 'STOP' && !data.stopPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'STOP orders require a stopPrice field',
      path: ['stopPrice'],
    });
  }
});

export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;

// Order response schema
export interface OrderResponse {
  orderId: string;
  exchangeId: string;
  portfolioId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: OrderStatus;
  filledQuantity: number;
  averagePrice?: number;
  createdAt: string;
  updatedAt: string;
}

// Cancel order request schema
export const CancelOrderSchema = z.object({
  orderId: z.string().uuid(),
  exchangeId: z.string().uuid(),
});

export type CancelOrderRequest = z.infer<typeof CancelOrderSchema>;

/**
 * Get order query params schema
 * 
 * Pagination defaults:
 * - limit: 50 (Default page size chosen to balance between usability and performance. 
 *   Allows users to review a meaningful set of orders while keeping response times 
 *   reasonable and avoiding memory issues on client/server. For high-frequency traders 
 *   who may have hundreds of orders, pagination is essential.)
 * - offset: 0 (Standard starting point for pagination)
 * - max limit: 100 (Maximum to prevent excessive load on database and API)
 */
export const GetOrderQuerySchema = z.object({
  exchangeId: z.string().uuid(),
  portfolioId: z.string().uuid().optional(),
  status: OrderStatusSchema.optional(),
  symbol: z.string().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

export type GetOrderQuery = z.infer<typeof GetOrderQuerySchema>;

// Portfolio query schema
export const GetPortfolioSchema = z.object({
  exchangeId: z.string().uuid(),
  portfolioId: z.string().uuid(),
});

export type GetPortfolioRequest = z.infer<typeof GetPortfolioSchema>;

// Position response
export interface PositionResponse {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

// Portfolio response
export interface PortfolioResponse {
  portfolioId: string;
  exchangeId: string;
  name: string;
  cashBalance: number;
  totalValue: number;
  positions: PositionResponse[];
}
