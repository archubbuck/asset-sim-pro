import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FeatureFlagResponse } from '@assetsim/shared/finance-models';
import { BaseApiService } from './base-api.service';

/**
 * Feature Flag API Service
 * 
 * Provides typed API calls for fetching feature flags and exchange configuration.
 * Based on backend implementation in apps/backend/src/functions/getExchangeRules.ts
 */
@Injectable({
  providedIn: 'root'
})
export class FeatureFlagApiService extends BaseApiService {
  /**
   * Get exchange rules (feature flags and configuration)
   * 
   * GET /api/v1/exchange/rules?exchangeId=<uuid>
   * 
   * Returns feature flags and exchange configuration for the specified exchange.
   * Implements ADR-021: Feature Flag Engine
   * 
   * @param exchangeId - UUID of the exchange
   * @returns Observable of feature flags and configuration
   */
  getExchangeRules(exchangeId: string): Observable<FeatureFlagResponse> {
    return this.get<FeatureFlagResponse>(`/exchange/rules?exchangeId=${exchangeId}`);
  }

  /**
   * Update exchange configuration (to be implemented in backend)
   * 
   * PUT /api/v1/exchange/rules?exchangeId=<uuid>
   * 
   * @param exchangeId - UUID of the exchange
   * @param configuration - Updated configuration
   * @returns Observable of the updated feature flags and configuration
   */
  updateExchangeRules(exchangeId: string, configuration: Partial<FeatureFlagResponse>): Observable<FeatureFlagResponse> {
    return this.put<FeatureFlagResponse>(`/exchange/rules?exchangeId=${exchangeId}`, configuration);
  }
}
