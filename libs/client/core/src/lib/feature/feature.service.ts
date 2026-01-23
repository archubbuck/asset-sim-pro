import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, tap } from 'rxjs';
import { FeatureFlagResponse } from '@assetsim/shared/finance-models';
import { LoggerService } from '../logger/logger.service';

/**
 * Feature Service
 * 
 * Implements ADR-021: Feature Flag Engine
 * Manages feature flags and exchange configuration for risk simulation rules
 * 
 * Features:
 * - Signal-based state management for reactive UI updates
 * - HTTP API integration with /api/v1/exchange/rules endpoint
 * - Feature flag checking via isEnabled() method
 * - Exchange configuration access via config computed signal
 * - Event logging for configuration changes
 * 
 * Usage:
 * ```typescript
 * const featureService = inject(FeatureService);
 * 
 * // Load features from API
 * await featureService.loadFeatures();
 * 
 * // Check if feature is enabled
 * if (featureService.isEnabled('advanced-charts')) {
 *   // Show advanced charts
 * }
 * 
 * // Access configuration
 * const config = featureService.config();
 * console.log(config.volatilityIndex);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class FeatureService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);

  /**
   * Internal signal state for feature flags and configuration
   * Uses private signal with computed public accessors
   */
  #state = signal<FeatureFlagResponse>({
    flags: {},
    configuration: {
      initialAum: 10000000,
      commissionBps: 5,
      allowMargin: true,
      volatilityIndex: 1.0,
      dashboardLayout: ['market-status', 'holdings-blotter']
    }
  });

  /**
   * Computed signal for feature flags
   * Returns current feature flag state
   */
  public readonly flags = computed(() => this.#state().flags);

  /**
   * Computed signal for exchange configuration
   * Returns current exchange configuration
   */
  public readonly config = computed(() => this.#state().configuration);

  /**
   * Load features from API endpoint
   * Fetches feature flags and exchange configuration from /api/v1/exchange/rules
   * Updates internal state and logs the event
   * 
   * @returns Promise resolving to the loaded FeatureFlagResponse
   * @throws Error if API call fails
   */
  public async loadFeatures(): Promise<FeatureFlagResponse> {
    try {
      const data = await firstValueFrom(
        this.http.get<FeatureFlagResponse>('/api/v1/exchange/rules').pipe(
          tap(response => {
            this.#state.set(response);
            this.logger.logEvent('ExchangeRulesLoaded', {
              volatility: response.configuration.volatilityIndex
            });
          })
        )
      );

      return data;
    } catch (error) {
      this.logger.logException(error instanceof Error ? error : new Error('Failed to load features'));
      throw error;
    }
  }

  /**
   * Check if a feature flag is enabled
   * 
   * @param key - Feature flag key to check
   * @returns true if feature is enabled, false otherwise
   * 
   * @example
   * if (featureService.isEnabled('margin-trading')) {
   *   // Enable margin trading UI
   * }
   */
  public isEnabled(key: string): boolean {
    return this.flags()[key] ?? false;
  }
}
