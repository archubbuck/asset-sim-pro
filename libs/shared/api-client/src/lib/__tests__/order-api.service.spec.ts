import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrderApiService } from '../order-api.service';
import { CreateOrderRequest, OrderResponse, ListOrdersQuery } from '../models/order.models';

describe('OrderApiService', () => {
  let service: OrderApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrderApiService]
    });
    service = TestBed.inject(OrderApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createOrder', () => {
    it('should create a buy order', () => {
      const request: CreateOrderRequest = {
        exchangeId: '123e4567-e89b-12d3-a456-426614174000',
        portfolioId: '223e4567-e89b-12d3-a456-426614174000',
        symbol: 'AAPL',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 150.50
      };
      const mockResponse: OrderResponse = {
        orderId: '323e4567-e89b-12d3-a456-426614174000',
        exchangeId: request.exchangeId,
        portfolioId: request.portfolioId,
        symbol: request.symbol,
        side: request.side,
        orderType: request.orderType,
        quantity: request.quantity,
        price: request.price,
        status: 'PENDING',
        filledQuantity: 0,
        createdAt: '2026-01-24T00:00:00Z',
        updatedAt: '2026-01-24T00:00:00Z'
      };

      service.createOrder(request).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.symbol).toBe('AAPL');
        expect(response.side).toBe('BUY');
      });

      const req = httpMock.expectOne('/api/v1/orders');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should create a market sell order', () => {
      const request: CreateOrderRequest = {
        exchangeId: '123e4567-e89b-12d3-a456-426614174000',
        portfolioId: '223e4567-e89b-12d3-a456-426614174000',
        symbol: 'MSFT',
        side: 'SELL',
        orderType: 'MARKET',
        quantity: 50
      };
      const mockResponse: OrderResponse = {
        orderId: '323e4567-e89b-12d3-a456-426614174000',
        exchangeId: request.exchangeId,
        portfolioId: request.portfolioId,
        symbol: request.symbol,
        side: request.side,
        orderType: request.orderType,
        quantity: request.quantity,
        status: 'PENDING',
        filledQuantity: 0,
        createdAt: '2026-01-24T00:00:00Z',
        updatedAt: '2026-01-24T00:00:00Z'
      };

      service.createOrder(request).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.symbol).toBe('MSFT');
        expect(response.side).toBe('SELL');
        expect(response.orderType).toBe('MARKET');
      });

      const req = httpMock.expectOne('/api/v1/orders');
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('getOrder', () => {
    it('should get an order by ID', () => {
      const orderId = '323e4567-e89b-12d3-a456-426614174000';
      const mockResponse: OrderResponse = {
        orderId,
        exchangeId: '123e4567-e89b-12d3-a456-426614174000',
        portfolioId: '223e4567-e89b-12d3-a456-426614174000',
        symbol: 'AAPL',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 150.50,
        status: 'FILLED',
        filledQuantity: 100,
        averagePrice: 150.45,
        createdAt: '2026-01-24T00:00:00Z',
        updatedAt: '2026-01-24T00:05:00Z'
      };

      service.getOrder(orderId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.orderId).toBe(orderId);
        expect(response.status).toBe('FILLED');
      });

      const req = httpMock.expectOne(`/api/v1/orders/${orderId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('listOrders', () => {
    it('should list orders with all filters', () => {
      const query: ListOrdersQuery = {
        exchangeId: '123e4567-e89b-12d3-a456-426614174000',
        portfolioId: '223e4567-e89b-12d3-a456-426614174000',
        status: 'FILLED',
        symbol: 'AAPL',
        limit: 10,
        offset: 0
      };
      const mockResponse: OrderResponse[] = [
        {
          orderId: '323e4567-e89b-12d3-a456-426614174000',
          exchangeId: query.exchangeId,
          portfolioId: '223e4567-e89b-12d3-a456-426614174000',
          symbol: 'AAPL',
          side: 'BUY',
          orderType: 'LIMIT',
          quantity: 100,
          price: 150.50,
          status: 'FILLED',
          filledQuantity: 100,
          createdAt: '2026-01-24T00:00:00Z',
          updatedAt: '2026-01-24T00:05:00Z'
        }
      ];

      service.listOrders(query).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(1);
      });

      const req = httpMock.expectOne((request) => {
        return request.url.includes('/api/v1/orders') &&
               request.url.includes('exchangeId=123e4567-e89b-12d3-a456-426614174000') &&
               request.url.includes('portfolioId=223e4567-e89b-12d3-a456-426614174000') &&
               request.url.includes('status=FILLED') &&
               request.url.includes('symbol=AAPL') &&
               request.url.includes('limit=10') &&
               request.url.includes('offset=0');
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should list orders with only required filter', () => {
      const query: ListOrdersQuery = {
        exchangeId: '123e4567-e89b-12d3-a456-426614174000'
      };
      const mockResponse: OrderResponse[] = [];

      service.listOrders(query).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(0);
      });

      const req = httpMock.expectOne((request) => {
        return request.url.includes('/api/v1/orders') &&
               request.url.includes('exchangeId=123e4567-e89b-12d3-a456-426614174000') &&
               !request.url.includes('portfolioId') &&
               !request.url.includes('status') &&
               !request.url.includes('symbol');
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order', () => {
      const orderId = '323e4567-e89b-12d3-a456-426614174000';
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResponse: OrderResponse = {
        orderId,
        exchangeId,
        portfolioId: '223e4567-e89b-12d3-a456-426614174000',
        symbol: 'AAPL',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 150.50,
        status: 'CANCELLED',
        filledQuantity: 0,
        createdAt: '2026-01-24T00:00:00Z',
        updatedAt: '2026-01-24T00:05:00Z'
      };

      service.cancelOrder(orderId, exchangeId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.status).toBe('CANCELLED');
      });

      const req = httpMock.expectOne(`/api/v1/orders/${orderId}?exchangeId=${exchangeId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });
  });
});
