import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as sql from 'mssql';
import { CreateExchangeSchema, ExchangeResponse } from '../types/exchange';
import { getConnectionPool } from '../lib/database';
import { requireAuthentication } from '../lib/auth';

/**
 * POST /api/v1/exchanges
 * 
 * Creates a new Simulation Venue (Exchange) and assigns the creator as RiskManager (Admin)
 * Implements ADR-002 provisioning workflow:
 * 1. Firm creates a new Simulation Venue via POST /api/v1/exchanges
 * 2. Backend creates Exchange record
 * 3. Backend inserts a record into ExchangeRoles assigning the RiskManager (Admin) role to the creator
 */
export async function createExchange(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // 1. Authenticate user (Microsoft Entra ID)
    const user = requireAuthentication(request);
    context.log(`User ${user.userId} requesting to create exchange`);

    // 2. Parse and validate request body
    const body = await request.json();
    const validationResult = CreateExchangeSchema.safeParse(body);

    if (!validationResult.success) {
      return {
        status: 400,
        jsonBody: {
          type: 'https://assetsim.com/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid request body',
          errors: validationResult.error.errors,
        },
      };
    }

    const { name } = validationResult.data;

    // 3. Create Exchange and assign RiskManager role in a transaction
    const pool = await getConnectionPool();
    const transaction = pool.transaction();

    try {
      await transaction.begin();

      // Create Exchange record
      const exchangeResult = await transaction.request()
        .input('name', sql.NVarChar, name)
        .input('createdBy', sql.UniqueIdentifier, user.userId)
        .query(`
          INSERT INTO [Trade].[Exchanges] ([Name], [CreatedBy])
          OUTPUT INSERTED.[ExchangeId], INSERTED.[Name], INSERTED.[CreatedAt], INSERTED.[CreatedBy]
          VALUES (@name, @createdBy)
        `);

      const exchange = exchangeResult.recordset[0];

      // Create default configuration for the exchange
      await transaction.request()
        .input('exchangeId', sql.UniqueIdentifier, exchange.ExchangeId)
        .query(`
          INSERT INTO [Trade].[ExchangeConfigurations] ([ExchangeId])
          VALUES (@exchangeId)
        `);

      // Assign RiskManager (Admin) role to the creator
      await transaction.request()
        .input('exchangeId', sql.UniqueIdentifier, exchange.ExchangeId)
        .input('userId', sql.UniqueIdentifier, user.userId)
        .input('role', sql.NVarChar, 'RiskManager')
        .query(`
          INSERT INTO [Trade].[ExchangeRoles] ([ExchangeId], [UserId], [Role])
          VALUES (@exchangeId, @userId, @role)
        `);

      await transaction.commit();

      context.log(`Exchange ${exchange.ExchangeId} created successfully by user ${user.userId}`);

      // 4. Return response
      const response: ExchangeResponse = {
        exchangeId: exchange.ExchangeId,
        name: exchange.Name,
        createdAt: exchange.CreatedAt,
        createdBy: exchange.CreatedBy,
      };

      return {
        status: 201,
        jsonBody: response,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    context.error('Error creating exchange:', error);

    if (error instanceof Error && error.message === 'Unauthorized: No valid user principal found') {
      return {
        status: 401,
        jsonBody: {
          type: 'https://assetsim.com/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Authentication required',
        },
      };
    }

    return {
      status: 500,
      jsonBody: {
        type: 'https://assetsim.com/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An error occurred while creating the exchange',
      },
    };
  }
}

app.http('createExchange', {
  methods: ['POST'],
  route: 'v1/exchanges',
  authLevel: 'anonymous', // Authentication handled by Azure Static Web Apps / Entra ID
  handler: createExchange,
});
