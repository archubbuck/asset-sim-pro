import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { CreateOrderRequest, OrderResponse, ListOrdersQuery } from './models/order.models';

/**
 * Order API Service
 * 
 * Provides typed API calls for order-related operations.
 * All endpoints are based on the backend implementation in apps/backend/src/functions/
 */
@Injectable({
  providedIn: 'root'
})
export class OrderApiService extends BaseApiService {
  /**
   * Create a new order
   * 
   * POST /api/v1/orders
   * 
   * @param request - Order creation request
   * @returns Observable of the created order
   */
  createOrder(request: CreateOrderRequest): Observable<OrderResponse> {
    return this.post<OrderResponse>('/orders', request);
  }

  /**
   * Get order by ID (to be implemented in backend)
   * 
   * GET /api/v1/orders/:id
   * 
   * @param orderId - UUID of the order
   * @returns Observable of the order details
   */
  getOrder(orderId: string): Observable<OrderResponse> {
    return this.get<OrderResponse>(`/orders/${orderId}`);
  }

  /**
   * List orders with optional filters (to be implemented in backend)
   * 
   * GET /api/v1/orders
   * 
   * @param query - Optional query parameters for filtering
   * @returns Observable of array of orders
   */
  listOrders(query: ListOrdersQuery): Observable<OrderResponse[]> {
    const params = new URLSearchParams();
    
    params.append('exchangeId', query.exchangeId);
    
    if (query.portfolioId) {
      params.append('portfolioId', query.portfolioId);
    }
    if (query.status) {
      params.append('status', query.status);
    }
    if (query.symbol) {
      params.append('symbol', query.symbol);
    }
    if (query.limit !== undefined) {
      params.append('limit', query.limit.toString());
    }
    if (query.offset !== undefined) {
      params.append('offset', query.offset.toString());
    }

    return this.get<OrderResponse[]>(`/orders?${params.toString()}`);
  }

  /**
   * Cancel an order (to be implemented in backend)
   * 
   * DELETE /api/v1/orders/:id
   * 
   * @param orderId - UUID of the order to cancel
   * @param exchangeId - UUID of the exchange
   * @returns Observable of the cancelled order
   */
  cancelOrder(orderId: string, exchangeId: string): Observable<OrderResponse> {
    return this.delete<OrderResponse>(`/orders/${orderId}?exchangeId=${exchangeId}`);
  }
}
