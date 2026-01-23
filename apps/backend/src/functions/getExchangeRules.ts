import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as sql from 'mssql';
import { z } from 'zod';
import { FeatureFlagResponse, ExchangeConfig, ExchangeFeatureFlags } from '@assetsim/shared/finance-models';
import { getConnectionPool } from '../lib/database';
import { requireAuthentication } from '../lib/auth';
import { getExchangeConfig, cacheExchangeConfig } from '../lib/cache';
import {
  createValidationErrorResponse,
  createNotFoundResponse,
  createForbiddenResponse,
  handleError,
} from '../lib/error-handler';

/**
 * Query parameter schema for GET /api/v1/exchange/rules
 */
const ExchangeRulesQuerySchema = z.object({
  exchangeId: z.string().uuid('exchangeId must be a valid UUID'),
});

/**
 * GET /api/v1/exchange/rules
 * 
 * Retrieves feature flags and exchange configuration for the specified exchange
 * Implements ADR-021: Feature Flag Engine
 * 
 * Query Parameters:
 * - exchangeId: UUID of the exchange
 * 
 * Returns:
 * - 200: FeatureFlagResponse with flags and configuration
 * - 400: Invalid exchangeId format
 * - 401: Unauthorized (no valid authentication)
 * - 403: Forbidden (user not assigned to exchange)
 * - 404: Exchange not found
 * - 500: Internal server error
 */
export async function getExchangeRules(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // 1. Authenticate user (Microsoft Entra ID)
    const user = requireAuthentication(request);
    context.log(`User ${user.userId} requesting exchange rules`);

    // 2. Validate query parameters
    const exchangeId = request.query.get('exchangeId');
    
    if (!exchangeId) {
      return createValidationErrorResponse(
        new z.ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['exchangeId'],
            message: 'exchangeId query parameter is required',
          },
        ])
      );
    }

    const validationResult = ExchangeRulesQuerySchema.safeParse({ exchangeId });

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { exchangeId: validExchangeId } = validationResult.data;

    // 3. Verify user has access to this exchange via ExchangeRoles (RBAC)
    const pool = await getConnectionPool();

    // Check if user has any role in the exchange
    const roleCheck = await pool.request()
      .input('exchangeId', sql.UniqueIdentifier, validExchangeId)
      .input('userId', sql.UniqueIdentifier, user.userId)
      .query(`
        SELECT Role 
        FROM [Trade].[ExchangeRoles]
        WHERE ExchangeId = @exchangeId AND UserId = @userId
      `);

    if (roleCheck.recordset.length === 0) {
      context.warn(`User ${user.userId} attempted to access exchange ${validExchangeId} without authorization`);
      return createForbiddenResponse(
        'You do not have access to this exchange. Please contact your Risk Manager for access.'
      );
    }

    context.log(`User ${user.userId} has role(s) in exchange ${validExchangeId}: ${roleCheck.recordset.map((r: any) => r.Role).join(', ')}`);

    // 4. Try to get configuration from cache first (ADR-008)
    let cachedConfig = await getExchangeConfig(validExchangeId);
    
    if (cachedConfig) {
      context.log(`Cache hit for exchange ${validExchangeId} configuration`);
    }

    // 5. Query Exchange Configuration from database
    const configResult = await pool.request()
      .input('exchangeId', sql.UniqueIdentifier, validExchangeId)
      .query(`
        SELECT 
          ec.VolatilityIndex,
          ec.StartingCash,
          ec.Commission,
          ec.AllowMargin,
          ec.MaxPortfolioSize,
          ec.DashboardLayout
        FROM [Trade].[ExchangeConfigurations] ec
        INNER JOIN [Trade].[Exchanges] e ON ec.ExchangeId = e.ExchangeId
        WHERE ec.ExchangeId = @exchangeId
      `);

    if (configResult.recordset.length === 0) {
      return createNotFoundResponse(
        'Exchange not found or configuration not initialized'
      );
    }

    const dbConfig = configResult.recordset[0];

    // 6. Query Feature Flags from database
    const flagsResult = await pool.request()
      .input('exchangeId', sql.UniqueIdentifier, validExchangeId)
      .query(`
        SELECT FeatureName, IsEnabled
        FROM [Trade].[ExchangeFeatureFlags]
        WHERE ExchangeId = @exchangeId
      `);

    // Transform feature flags array to key-value pairs
    const flags: ExchangeFeatureFlags = {};
    flagsResult.recordset.forEach((flag: any) => {
      flags[flag.FeatureName] = flag.IsEnabled;
    });

    // 7. Parse dashboard layout JSON
    let dashboardLayout: string[];
    try {
      dashboardLayout = JSON.parse(dbConfig.DashboardLayout || '[]');
    } catch (error) {
      context.warn(`Failed to parse DashboardLayout JSON for exchange ${validExchangeId}, using default`);
      dashboardLayout = ['market-status', 'holdings-blotter'];
    }

    // 8. Build ExchangeConfig response
    const configuration: ExchangeConfig = {
      initialAum: parseFloat(dbConfig.StartingCash),
      commissionBps: parseFloat(dbConfig.Commission),
      allowMargin: dbConfig.AllowMargin,
      volatilityIndex: parseFloat(dbConfig.VolatilityIndex),
      dashboardLayout,
    };

    // 9. Cache the configuration for future requests (5 minutes TTL)
    try {
      await cacheExchangeConfig(validExchangeId, {
        volatilityIndex: configuration.volatilityIndex,
        startingCash: configuration.initialAum,
        commission: configuration.commissionBps,
        allowMargin: configuration.allowMargin,
        maxPortfolioSize: dbConfig.MaxPortfolioSize,
        dashboardLayout: dbConfig.DashboardLayout,
      });
      context.log(`Configuration cached for exchange ${validExchangeId}`);
    } catch (cacheError) {
      // Log but don't fail the request if caching fails
      context.warn(`Failed to cache exchange config: ${cacheError}`);
    }

    // 10. Build and return FeatureFlagResponse
    const response: FeatureFlagResponse = {
      flags,
      configuration,
    };

    context.log(`Successfully retrieved exchange rules for ${validExchangeId}`);

    return {
      status: 200,
      jsonBody: response,
    };
  } catch (error) {
    context.error('Error retrieving exchange rules:', error);
    return handleError(error);
  }
}

app.http('getExchangeRules', {
  methods: ['GET'],
  route: 'v1/exchange/rules',
  authLevel: 'anonymous', // Authentication handled by Azure Static Web Apps / Entra ID
  handler: getExchangeRules,
});
