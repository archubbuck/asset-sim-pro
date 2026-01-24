import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ExchangeApiService } from './exchange-api.service';
import { CreateExchangeRequest, ExchangeResponse } from './models/exchange.models';

describe('ExchangeApiService', () => {
  let service: ExchangeApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ExchangeApiService]
    });
    service = TestBed.inject(ExchangeApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createExchange', () => {
    it('should create an exchange', () => {
      const request: CreateExchangeRequest = { name: 'Test Exchange' };
      const mockResponse: ExchangeResponse = {
        exchangeId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Exchange',
        createdAt: '2026-01-24T00:00:00Z',
        createdBy: '456e4567-e89b-12d3-a456-426614174001'
      };

      service.createExchange(request).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.name).toBe('Test Exchange');
      });

      const req = httpMock.expectOne('/api/v1/exchanges');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });
  });

  describe('getExchange', () => {
    it('should get an exchange by ID', () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResponse: ExchangeResponse = {
        exchangeId,
        name: 'Test Exchange',
        createdAt: '2026-01-24T00:00:00Z',
        createdBy: '456e4567-e89b-12d3-a456-426614174001'
      };

      service.getExchange(exchangeId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.exchangeId).toBe(exchangeId);
      });

      const req = httpMock.expectOne(`/api/v1/exchanges/${exchangeId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('listExchanges', () => {
    it('should list all exchanges', () => {
      const mockResponse: ExchangeResponse[] = [
        {
          exchangeId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Exchange 1',
          createdAt: '2026-01-24T00:00:00Z',
          createdBy: '456e4567-e89b-12d3-a456-426614174001'
        },
        {
          exchangeId: '223e4567-e89b-12d3-a456-426614174000',
          name: 'Exchange 2',
          createdAt: '2026-01-24T00:00:00Z',
          createdBy: '456e4567-e89b-12d3-a456-426614174001'
        }
      ];

      service.listExchanges().subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.length).toBe(2);
      });

      const req = httpMock.expectOne('/api/v1/exchanges');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('updateExchange', () => {
    it('should update an exchange', () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const request: Partial<CreateExchangeRequest> = { name: 'Updated Exchange' };
      const mockResponse: ExchangeResponse = {
        exchangeId,
        name: 'Updated Exchange',
        createdAt: '2026-01-24T00:00:00Z',
        createdBy: '456e4567-e89b-12d3-a456-426614174001'
      };

      service.updateExchange(exchangeId, request).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.name).toBe('Updated Exchange');
      });

      const req = httpMock.expectOne(`/api/v1/exchanges/${exchangeId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });
  });

  describe('deleteExchange', () => {
    it('should delete an exchange', () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';

      service.deleteExchange(exchangeId).subscribe(response => {
        expect(response).toBeUndefined();
      });

      const req = httpMock.expectOne(`/api/v1/exchanges/${exchangeId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
