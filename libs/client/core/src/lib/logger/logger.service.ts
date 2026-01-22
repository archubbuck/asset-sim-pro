import { Injectable } from '@angular/core';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

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
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private appInsights: ApplicationInsights;
  private isEnabled = false;

  constructor() {
    // APP_INSIGHTS_CONNECTION_STRING is injected via build-time env replacement
    // In strict environments, this is retrieved from a runtime config.json fetch
    // Use empty string as default for library builds
    const connectionString = (typeof process !== 'undefined' && process.env) ? (process.env['APP_INSIGHTS_CONNECTION_STRING'] || '') : '';

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
