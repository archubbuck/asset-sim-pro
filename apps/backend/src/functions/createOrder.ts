import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as sql from 'mssql';
import Decimal from 'decimal.js';
import { CreateOrderSchema, OrderResponse } from '../types/transaction';
import { getConnectionPool } from '../lib/database';
import { requireAuthentication } from '../lib/auth';
import {
  createValidationErrorResponse,
  createNotFoundResponse,
  createInsufficientFundsResponse,
  handleError,
} from '../lib/error-handler';

/**
 * POST /api/v1/orders
 * 
 * Creates a new order in the exchange
 * Implements ADR-007: Transaction API with HTTP Triggers and Zod validation
 */
export async function createOrder(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // 1. Authenticate user (Microsoft Entra ID)
    const user = requireAuthentication(request);
    context.log(`User ${user.userId} requesting to create order`);

    // 2. Parse and validate request body with Zod
    const body = await request.json();
    const validationResult = CreateOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { exchangeId, symbol, side, orderType, quantity, price, stopPrice, portfolioId } = validationResult.data;

    // 3. Verify user has access to this exchange and portfolio
    const pool = await getConnectionPool();

    // Set RLS context for the user and exchange
    await pool.request()
      .input('userId', sql.UniqueIdentifier, user.userId)
      .input('exchangeId', sql.UniqueIdentifier, exchangeId)
      .query(`
        EXEC sp_set_session_context @key = N'UserId', @value = @userId;
        EXEC sp_set_session_context @key = N'ExchangeId', @value = @exchangeId;
      `);

    // Validate that the exchange exists and is active
    const exchangeCheck = await pool.request()
      .input('exchangeId', sql.UniqueIdentifier, exchangeId)
      .query(`
        SELECT ExchangeId
        FROM [Trade].[Exchanges]
        WHERE ExchangeId = @exchangeId AND IsActive = 1
      `);

    if (exchangeCheck.recordset.length === 0) {
      return createNotFoundResponse('Exchange not found or is inactive');
    }

    // Verify portfolio ownership (RLS will enforce this)
    const portfolioCheck = await pool.request()
      .input('portfolioId', sql.UniqueIdentifier, portfolioId)
      .input('exchangeId', sql.UniqueIdentifier, exchangeId)
      .query(`
        SELECT PortfolioId, CashBalance FROM [Trade].[Portfolios]
        WHERE PortfolioId = @portfolioId AND ExchangeId = @exchangeId
      `);

    if (portfolioCheck.recordset.length === 0) {
      return createNotFoundResponse('Portfolio not found or you do not have access to it');
    }

    const portfolio = portfolioCheck.recordset[0];
    
    // Validate sufficient cash balance for BUY orders using Decimal.js (ADR-006)
    // Note: MARKET orders cannot be validated at creation time since they don't have a price.
    // MARKET orders will be validated during order matching in the market engine when the
    // current market price is known.
    if (side === 'BUY' && (orderType === 'LIMIT' || orderType === 'STOP_LIMIT') && price) {
      const cashBalance = new Decimal(portfolio.CashBalance);
      const orderQuantity = new Decimal(quantity);
      const orderPrice = new Decimal(price);
      const requiredCash = orderQuantity.times(orderPrice);
      
      if (cashBalance.lessThan(requiredCash)) {
        return createInsufficientFundsResponse(
          `Insufficient cash balance. Required: ${requiredCash.toFixed(2)}, Available: ${cashBalance.toFixed(2)}`
        );
      }
    }

    // 4. Create order record
    const orderResult = await pool.request()
      .input('exchangeId', sql.UniqueIdentifier, exchangeId)
      .input('portfolioId', sql.UniqueIdentifier, portfolioId)
      .input('symbol', sql.NVarChar, symbol)
      .input('side', sql.NVarChar, side)
      .input('orderType', sql.NVarChar, orderType)
      .input('quantity', sql.Decimal(18, 8), quantity)
      .input('price', sql.Decimal(18, 8), price ?? null)
      .input('stopPrice', sql.Decimal(18, 8), stopPrice ?? null)
      .input('status', sql.NVarChar, 'PENDING')
      .input('filledQuantity', sql.Decimal(18, 8), 0)
      .query(`
        INSERT INTO [Trade].[Orders] 
        ([ExchangeId], [PortfolioId], [Symbol], [Side], [OrderType], [Quantity], [Price], [StopPrice], [Status], [FilledQuantity])
        OUTPUT 
          INSERTED.[OrderId], 
          INSERTED.[ExchangeId],
          INSERTED.[PortfolioId],
          INSERTED.[Symbol],
          INSERTED.[Side],
          INSERTED.[OrderType],
          INSERTED.[Quantity],
          INSERTED.[Price],
          INSERTED.[StopPrice],
          INSERTED.[Status],
          INSERTED.[FilledQuantity],
          INSERTED.[CreatedAt],
          INSERTED.[UpdatedAt]
        VALUES 
        (@exchangeId, @portfolioId, @symbol, @side, @orderType, @quantity, @price, @stopPrice, @status, @filledQuantity)
      `);

    const order = orderResult.recordset[0];

    context.log(`Order ${order.OrderId} created successfully for portfolio ${portfolioId}`);

    // 5. Return response using Decimal.js for precision (ADR-006)
    const response: OrderResponse = {
      orderId: order.OrderId,
      exchangeId: order.ExchangeId,
      portfolioId: order.PortfolioId,
      symbol: order.Symbol,
      side: order.Side,
      orderType: order.OrderType,
      quantity: new Decimal(order.Quantity).toNumber(),
      price: order.Price ? new Decimal(order.Price).toNumber() : undefined,
      stopPrice: order.StopPrice ? new Decimal(order.StopPrice).toNumber() : undefined,
      status: order.Status,
      filledQuantity: new Decimal(order.FilledQuantity).toNumber(),
      createdAt: order.CreatedAt,
      updatedAt: order.UpdatedAt,
    };

    return {
      status: 201,
      jsonBody: response,
    };
  } catch (error) {
    context.error('Error creating order:', error);
    return handleError(error);
  }
}

app.http('createOrder', {
  methods: ['POST'],
  route: 'v1/orders',
  authLevel: 'anonymous', // Authentication handled by Azure Static Web Apps / Entra ID
  handler: createOrder,
});
