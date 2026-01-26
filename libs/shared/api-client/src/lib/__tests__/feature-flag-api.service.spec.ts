import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FeatureFlagApiService } from '../feature-flag-api.service';
import { FeatureFlagResponse } from '@assetsim/shared/finance-models';

describe('FeatureFlagApiService', () => {
  let service: FeatureFlagApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FeatureFlagApiService]
    });
    service = TestBed.inject(FeatureFlagApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getExchangeRules', () => {
    it('should get exchange rules with feature flags and configuration', () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResponse: FeatureFlagResponse = {
        flags: {
          'enableAdvancedCharts': true,
          'enableOptions': false,
          'enableMarginTrading': true
        },
        configuration: {
          initialAum: 10000000,
          commissionBps: 5,
          allowMargin: true,
          volatilityIndex: 1.0,
          dashboardLayout: ['market-status', 'holdings-blotter', 'order-entry']
        }
      };

      service.getExchangeRules(exchangeId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.flags['enableAdvancedCharts']).toBe(true);
        expect(response.configuration.initialAum).toBe(10000000);
        expect(response.configuration.commissionBps).toBe(5);
      });

      const req = httpMock.expectOne(`/api/v1/exchange/rules?exchangeId=${exchangeId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle empty feature flags', () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResponse: FeatureFlagResponse = {
        flags: {},
        configuration: {
          initialAum: 10000000,
          commissionBps: 5,
          allowMargin: true,
          volatilityIndex: 1.0,
          dashboardLayout: []
        }
      };

      service.getExchangeRules(exchangeId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(Object.keys(response.flags).length).toBe(0);
        expect(response.configuration.dashboardLayout.length).toBe(0);
      });

      const req = httpMock.expectOne(`/api/v1/exchange/rules?exchangeId=${exchangeId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('updateExchangeRules', () => {
    it('should update exchange rules', () => {
      const exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      const updateRequest: Partial<FeatureFlagResponse> = {
        configuration: {
          initialAum: 20000000,
          commissionBps: 10,
          allowMargin: false,
          volatilityIndex: 1.5,
          dashboardLayout: ['market-status']
        }
      };
      const mockResponse: FeatureFlagResponse = {
        flags: {
          'enableAdvancedCharts': true,
          'enableOptions': false
        },
        configuration: {
          initialAum: 20000000,
          commissionBps: 10,
          allowMargin: false,
          volatilityIndex: 1.5,
          dashboardLayout: ['market-status']
        }
      };

      service.updateExchangeRules(exchangeId, updateRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.configuration.initialAum).toBe(20000000);
        expect(response.configuration.allowMargin).toBe(false);
      });

      const req = httpMock.expectOne(`/api/v1/exchange/rules?exchangeId=${exchangeId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateRequest);
      req.flush(mockResponse);
    });
  });
});
