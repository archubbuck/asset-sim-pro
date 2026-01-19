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

// Create order request schema
export const CreateOrderSchema = z.object({
  exchangeId: z.string().uuid(),
  symbol: z.string().min(1).max(20),
  side: OrderSideSchema,
  orderType: OrderTypeSchema,
  quantity: z.number().positive(),
  price: z.number().positive().optional(), // Required for LIMIT orders
  stopPrice: z.number().positive().optional(), // Required for STOP orders
  portfolioId: z.string().uuid(),
}).refine(
  (data) => {
    // LIMIT and STOP_LIMIT orders require price
    if ((data.orderType === 'LIMIT' || data.orderType === 'STOP_LIMIT') && !data.price) {
      return false;
    }
    // STOP and STOP_LIMIT orders require stopPrice
    if ((data.orderType === 'STOP' || data.orderType === 'STOP_LIMIT') && !data.stopPrice) {
      return false;
    }
    return true;
  },
  {
    message: 'Price and stopPrice must be provided for respective order types',
  }
);

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

// Get order query params schema
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
