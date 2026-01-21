import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  CreateOrderSchema,
  OrderSideSchema,
  OrderTypeSchema,
  OrderStatusSchema,
  CancelOrderSchema,
  GetOrderQuerySchema,
  GetPortfolioSchema,
} from '../types/transaction';
import {
  CreateExchangeSchema,
} from '../types/exchange';

/**
 * OpenAPI Registry for AssetSim Pro API
 * Implements ADR-017: API Documentation & Standards
 * 
 * Code-first OpenAPI generation using zod-to-openapi
 */

// Extend Zod with OpenAPI methods
extendZodWithOpenApi(z);

// Initialize the OpenAPI registry
export const registry = new OpenAPIRegistry();

// Register common error response schema (RFC 7807)
const ErrorResponseSchema = z.object({
  type: z.string().describe('A URI reference that identifies the problem type'),
  title: z.string().describe('A short, human-readable summary of the problem'),
  status: z.number().describe('The HTTP status code'),
  detail: z.string().describe('A human-readable explanation specific to this occurrence'),
  errors: z.array(z.any()).optional().describe('Validation errors (if applicable)'),
});

registry.register('ErrorResponse', ErrorResponseSchema);

// Register order-related schemas
registry.register('OrderSide', OrderSideSchema);
registry.register('OrderType', OrderTypeSchema);
registry.register('OrderStatus', OrderStatusSchema);
registry.register('CreateOrder', CreateOrderSchema);
registry.register('CancelOrder', CancelOrderSchema);
registry.register('GetOrderQuery', GetOrderQuerySchema);

// Order response schema
const OrderResponseSchema = z.object({
  orderId: z.string().uuid(),
  exchangeId: z.string().uuid(),
  portfolioId: z.string().uuid(),
  symbol: z.string(),
  side: OrderSideSchema,
  orderType: OrderTypeSchema,
  quantity: z.number(),
  price: z.number().optional(),
  stopPrice: z.number().optional(),
  status: OrderStatusSchema,
  filledQuantity: z.number(),
  averagePrice: z.number().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

registry.register('OrderResponse', OrderResponseSchema);

// Register exchange-related schemas
registry.register('CreateExchange', CreateExchangeSchema);

// Exchange response schema
const ExchangeResponseSchema = z.object({
  exchangeId: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
  createdBy: z.string().uuid(),
});

registry.register('ExchangeResponse', ExchangeResponseSchema);

// Portfolio response schemas
const PositionResponseSchema = z.object({
  symbol: z.string(),
  quantity: z.number(),
  averagePrice: z.number(),
  currentPrice: z.number(),
  unrealizedPnL: z.number(),
  realizedPnL: z.number(),
});

const PortfolioResponseSchema = z.object({
  portfolioId: z.string().uuid(),
  exchangeId: z.string().uuid(),
  name: z.string(),
  cashBalance: z.number(),
  totalValue: z.number(),
  positions: z.array(PositionResponseSchema),
});

registry.register('PositionResponse', PositionResponseSchema);
registry.register('PortfolioResponse', PortfolioResponseSchema);
registry.register('GetPortfolio', GetPortfolioSchema);

// Register API endpoints

// POST /api/v1/orders
registry.registerPath({
  method: 'post',
  path: '/api/v1/orders',
  summary: 'Create a new order',
  description: 'Creates a new trading order in the exchange',
  tags: ['Orders'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateOrderSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Order created successfully',
      content: {
        'application/json': {
          schema: OrderResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - Authentication required',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - Insufficient permissions',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
});

// POST /api/v1/exchanges
registry.registerPath({
  method: 'post',
  path: '/api/v1/exchanges',
  summary: 'Create a new exchange',
  description: 'Creates a new simulation venue (exchange) and assigns the creator as RiskManager',
  tags: ['Exchanges'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateExchangeSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Exchange created successfully',
      content: {
        'application/json': {
          schema: ExchangeResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - Authentication required',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
});

/**
 * Generate OpenAPI v3 specification
 */
export function generateOpenAPISpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  const document = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'AssetSim Pro API',
      version: '1.0.0',
      description: 'Enterprise-grade simulation platform API for Asset Management Firms, Hedge Funds, and Proprietary Trading Desks',
      contact: {
        name: 'AssetSim Pro Support',
        url: 'https://assetsim.com',
      },
    },
    servers: [
      {
        url: 'https://api.assetsim.com',
        description: 'Production API',
      },
      {
        url: 'https://api-staging.assetsim.com',
        description: 'Staging API',
      },
      {
        url: 'http://localhost:7071',
        description: 'Local Development',
      },
    ],
    tags: [
      {
        name: 'Orders',
        description: 'Order management endpoints',
      },
      {
        name: 'Exchanges',
        description: 'Exchange (simulation venue) management',
      },
    ],
  });

  // Manually add security schemes to components as they are not part of the registry
  if (!document.components) {
    document.components = {};
  }
  
  document.components.securitySchemes = {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Microsoft Entra ID (Azure AD) JWT token',
    },
  };

  return document;
}
