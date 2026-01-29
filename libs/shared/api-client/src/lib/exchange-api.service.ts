import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { CreateExchangeRequest, ExchangeResponse } from './models/exchange.models';

/**
 * Exchange API Service
 * 
 * Provides typed API calls for exchange-related operations.
 * All endpoints are based on the backend implementation in apps/backend/src/functions/
 */
@Injectable({
  providedIn: 'root'
})
export class ExchangeApiService extends BaseApiService {
  /**
   * Create a new exchange (simulation venue)
   * 
   * POST /api/v1/exchanges
   * 
   * @param request - Exchange creation request
   * @returns Observable of the created exchange
   */
  createExchange(request: CreateExchangeRequest): Observable<ExchangeResponse> {
    return this.post<ExchangeResponse>('/exchanges', request);
  }

  /**
   * Get exchange by ID (to be implemented in backend)
   * 
   * GET /api/v1/exchanges/:id
   * 
   * @param exchangeId - UUID of the exchange
   * @returns Observable of the exchange details
   */
  getExchange(exchangeId: string): Observable<ExchangeResponse> {
    return this.get<ExchangeResponse>(`/exchanges/${exchangeId}`);
  }

  /**
   * List all exchanges for the current user (to be implemented in backend)
   * 
   * GET /api/v1/exchanges
   * 
   * @returns Observable of array of exchanges
   */
  listExchanges(): Observable<ExchangeResponse[]> {
    return this.get<ExchangeResponse[]>('/exchanges');
  }

  /**
   * Update exchange (to be implemented in backend)
   * 
   * PUT /api/v1/exchanges/:id
   * 
   * @param exchangeId - UUID of the exchange
   * @param request - Exchange update request
   * @returns Observable of the updated exchange
   */
  updateExchange(exchangeId: string, request: Partial<CreateExchangeRequest>): Observable<ExchangeResponse> {
    return this.put<ExchangeResponse>(`/exchanges/${exchangeId}`, request);
  }

  /**
   * Delete exchange (to be implemented in backend)
   * 
   * DELETE /api/v1/exchanges/:id
   * 
   * @param exchangeId - UUID of the exchange
   * @returns Observable of void
   */
  deleteExchange(exchangeId: string): Observable<void> {
    return this.delete<void>(`/exchanges/${exchangeId}`);
  }
}
