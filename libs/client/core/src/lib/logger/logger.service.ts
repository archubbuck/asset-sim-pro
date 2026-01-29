import { Injectable, InjectionToken, Optional, Inject } from '@angular/core';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

/**
 * Configuration interface for Logger Service
 */
export interface LoggerConfig {
  connectionString?: string;
}

/**
 * Injection token for Logger configuration
 * 
 * Usage in application:
 * ```typescript
 * providers: [
 *   { provide: LOGGER_CONFIG, useValue: { connectionString: environment.appInsightsConnectionString } }
 * ]
 * ```
 */
export const LOGGER_CONFIG = new InjectionToken<LoggerConfig>('LOGGER_CONFIG');

/**
 * Logger Service
 * 
 * Centralized logging service that wraps Azure Application Insights SDK
 * Implements ADR-019: Enterprise Logging
 * 
 * Features:
 * - Page view tracking (enableAutoRouteTracking)
 * - CORS correlation for frontend-backend trace linking
 * - Conditional logging based on connection string availability
 * - Configuration via dependency injection for library compatibility
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private appInsights: ApplicationInsights;
  private isEnabled = false;

  constructor(@Optional() @Inject(LOGGER_CONFIG) config?: LoggerConfig) {
    // Connection string is provided via dependency injection
    // This allows the library to be used in any Angular application
    const connectionString = config?.connectionString || '';

    this.appInsights = new ApplicationInsights({
      config: {
        connectionString: connectionString,
        enableAutoRouteTracking: true, // Tracks PageViews
        disableInstrumentationKeyValidation: true, // Required for Private Link endpoints
        enableCorsCorrelation: true // Links Frontend traces to Backend functions
      }
    });

    if (connectionString) {
      try {
        this.appInsights.loadAppInsights();
        this.isEnabled = true;
      } catch (e) {
        console.error('Failed to initialize App Insights', e);
      }
    }
  }

  /**
   * Log a custom event to Application Insights
   * @param name - Event name
   * @param properties - Optional custom properties to attach to the event
   */
  public logEvent(name: string, properties?: Record<string, unknown>): void {
    if (this.isEnabled) {
      this.appInsights.trackEvent({ name }, properties);
    }
  }

  /**
   * Log a trace message to Application Insights
   * @param message - Trace message
   * @param properties - Optional custom properties to attach to the trace
   */
  public logTrace(message: string, properties?: Record<string, unknown>): void {
    if (this.isEnabled) {
      this.appInsights.trackTrace({ message }, properties);
    }
  }

  /**
   * Log an exception to Application Insights
   * @param exception - Error object to log
   * @param severityLevel - Optional severity level (0-4: Verbose, Information, Warning, Error, Critical)
   */
  public logException(exception: Error, severityLevel?: number): void {
    if (this.isEnabled) {
      this.appInsights.trackException({ exception, severityLevel });
    } else {
      // Local Fallback
      console.error(exception);
    }
  }
}
