import * as appInsights from 'applicationinsights';
import { InvocationContext } from '@azure/functions';

let telemetryClient: appInsights.TelemetryClient | null = null;

/**
 * ADR-025: Observability & Health Checks
 * 
 * Telemetry service for Application Insights custom metrics.
 * Monitors the ticker/SignalR broadcasting system to ensure it's functioning correctly.
 * 
 * Key Metrics:
 * - UpdatesBroadcasted: Total number of price updates broadcast via SignalR
 * - BroadcastFailures: Number of failed broadcast attempts
 * - DeadbandFiltered: Updates filtered out by deadband threshold (<$0.01)
 * 
 * Alert Configuration:
 * - Sev1 Alert if UpdatesBroadcasted < 100 in 5 minutes
 */

/**
 * Initialize Application Insights telemetry client
 * 
 * This is called automatically when the client is first accessed.
 * Azure Functions automatically provides APPLICATIONINSIGHTS_CONNECTION_STRING
 */
function initializeTelemetry(): appInsights.TelemetryClient | null {
  if (telemetryClient) {
    return telemetryClient;
  }

  // Azure Functions automatically configures Application Insights
  // Check if it's already set up
  if (appInsights.defaultClient) {
    telemetryClient = appInsights.defaultClient;
    return telemetryClient;
  }

  // If not already set up, try to initialize it
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (!connectionString) {
    // Application Insights not configured - this is okay for local development
    console.warn('Application Insights not configured. Custom metrics will not be tracked.');
    return null;
  }

  try {
    appInsights.setup(connectionString)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true)
      .setUseDiskRetryCaching(true)
      .start();

    telemetryClient = appInsights.defaultClient;
    return telemetryClient;
  } catch (error) {
    console.error('Failed to initialize Application Insights:', error);
    return null;
  }
}

/**
 * Get telemetry client instance
 */
function getTelemetryClient(): appInsights.TelemetryClient | null {
  if (!telemetryClient) {
    return initializeTelemetry();
  }
  return telemetryClient;
}

/**
 * Track a successful price update broadcast
 * 
 * ADR-025: Primary heartbeat metric
 * Alert triggers if this metric < 100 in 5 minutes
 * 
 * @param exchangeId - Exchange identifier
 * @param symbol - Trading symbol
 * @param context - Azure Functions context for logging
 */
export function trackUpdateBroadcasted(
  exchangeId: string,
  symbol: string,
  context: InvocationContext
): void {
  const client = getTelemetryClient();
  
  if (!client) {
    // Silently skip if Application Insights is not configured
    return;
  }

  try {
    client.trackMetric({
      name: 'UpdatesBroadcasted',
      value: 1,
      properties: {
        exchangeId,
        symbol,
      },
    });
  } catch (error) {
    // Log but don't throw - metrics should not break the main functionality
    context.warn(`Failed to track UpdatesBroadcasted metric: ${error}`);
  }
}

/**
 * Track a failed broadcast attempt
 * 
 * @param exchangeId - Exchange identifier
 * @param symbol - Trading symbol
 * @param errorMessage - Error message
 * @param context - Azure Functions context for logging
 */
export function trackBroadcastFailure(
  exchangeId: string,
  symbol: string,
  errorMessage: string,
  context: InvocationContext
): void {
  const client = getTelemetryClient();
  
  if (!client) {
    return;
  }

  try {
    client.trackMetric({
      name: 'BroadcastFailures',
      value: 1,
      properties: {
        exchangeId,
        symbol,
        error: errorMessage,
      },
    });
  } catch (error) {
    context.warn(`Failed to track BroadcastFailures metric: ${error}`);
  }
}

/**
 * Track updates filtered by deadband threshold
 * 
 * @param exchangeId - Exchange identifier
 * @param symbol - Trading symbol
 * @param context - Azure Functions context for logging
 */
export function trackDeadbandFiltered(
  exchangeId: string,
  symbol: string,
  context: InvocationContext
): void {
  const client = getTelemetryClient();
  
  if (!client) {
    return;
  }

  try {
    client.trackMetric({
      name: 'DeadbandFiltered',
      value: 1,
      properties: {
        exchangeId,
        symbol,
      },
    });
  } catch (error) {
    context.warn(`Failed to track DeadbandFiltered metric: ${error}`);
  }
}

/**
 * Track broadcast latency
 * 
 * @param durationMs - Duration in milliseconds
 * @param exchangeId - Exchange identifier
 * @param symbol - Trading symbol
 * @param context - Azure Functions context for logging
 */
export function trackBroadcastLatency(
  durationMs: number,
  exchangeId: string,
  symbol: string,
  context: InvocationContext
): void {
  const client = getTelemetryClient();
  
  if (!client) {
    return;
  }

  try {
    client.trackMetric({
      name: 'BroadcastLatency',
      value: durationMs,
      properties: {
        exchangeId,
        symbol,
      },
    });
  } catch (error) {
    context.warn(`Failed to track BroadcastLatency metric: ${error}`);
  }
}

/**
 * Reset telemetry client (for testing purposes)
 * @internal
 */
export function resetTelemetryClient(): void {
  telemetryClient = null;
}
