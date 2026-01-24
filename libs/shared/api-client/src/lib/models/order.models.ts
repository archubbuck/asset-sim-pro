/**
 * Order API Request and Response Models
 * 
 * These models align with backend types in apps/backend/src/types/transaction.ts
 */

/**
 * Order side enum
 */
export type OrderSide = 'BUY' | 'SELL';

/**
 * Order type enum
 */
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';

/**
 * Order status enum
 */
export type OrderStatus = 'PENDING' | 'FILLED' | 'PARTIAL' | 'CANCELLED' | 'REJECTED';

/**
 * Request body for creating a new order
 */
export interface CreateOrderRequest {
  exchangeId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  portfolioId: string;
}

/**
 * Response from creating or retrieving an order
 */
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

/**
 * Query parameters for listing orders
 */
export interface ListOrdersQuery {
  exchangeId: string;
  portfolioId?: string;
  status?: OrderStatus;
  symbol?: string;
  limit?: number;
  offset?: number;
}
