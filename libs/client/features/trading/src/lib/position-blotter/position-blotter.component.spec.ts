import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PositionBlotterComponent } from './position-blotter.component';
import { OrderApiService } from '@assetsim/shared/api-client';
import { of, throwError } from 'rxjs';
import { OrderResponse } from '@assetsim/shared/api-client';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TRADING_STUB_CONFIG, TradingStubConfig } from '../models/trading-config';
import { provideAnimations } from '@angular/platform-browser/animations';

/**
 * PositionBlotterComponent tests
 */
describe('PositionBlotterComponent', () => {
  let component: PositionBlotterComponent;
  let fixture: ComponentFixture<PositionBlotterComponent>;
  let mockOrderApiService: Partial<OrderApiService>;

  // Test configuration - uses UUID format for backend compatibility
  const testConfig: TradingStubConfig = {
    exchangeId: '10000000-0000-0000-0000-000000000000',
    portfolioId: '10000000-0000-0000-0000-000000000001',
    orderIdPrefix: 'test-order'
  };

  const mockOrders: OrderResponse[] = [
    {
      orderId: 'ord-001',
      exchangeId: '10000000-0000-0000-0000-000000000000',
      portfolioId: '10000000-0000-0000-0000-000000000001',
      symbol: 'AAPL',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 100,
      filledQuantity: 100,
      averagePrice: 178.50,
      status: 'FILLED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      orderId: 'ord-002',
      exchangeId: '10000000-0000-0000-0000-000000000000',
      portfolioId: '10000000-0000-0000-0000-000000000001',
      symbol: 'MSFT',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 50,
      price: 380.00,
      filledQuantity: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  beforeEach(async () => {
    mockOrderApiService = {
      listOrders: jest.fn().mockReturnValue(of(mockOrders)),
      cancelOrder: jest.fn().mockReturnValue(of({ ...mockOrders[1], status: 'CANCELLED' }))
    };

    await TestBed.configureTestingModule({
      imports: [PositionBlotterComponent],
      providers: [
        provideAnimations(),
        { provide: OrderApiService, useValue: mockOrderApiService },
        { provide: TRADING_STUB_CONFIG, useValue: testConfig }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore Kendo UI component templates in tests
    }).compileComponents();

    fixture = TestBed.createComponent(PositionBlotterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load orders on init', async () => {
    await component.ngOnInit();

    expect(mockOrderApiService.listOrders).toHaveBeenCalled();
    expect(component.orders().length).toBe(2);
  });

  it('should load stub data on API error', async () => {
    mockOrderApiService.listOrders = jest.fn().mockReturnValue(
      throwError(() => new Error('API error'))
    );

    await component.ngOnInit();

    // Should still have data from stub
    expect(component.orders().length).toBeGreaterThan(0);
  });

  it('should filter orders by status', () => {
    component.orders.set(mockOrders);
    
    // Filter to show only FILLED
    component.filterStatus = 'FILLED';
    component.updateGridView();
    
    expect(component.gridView.data.length).toBe(1);
    expect(component.gridView.data[0].status).toBe('FILLED');
  });

  it('should filter orders to show only open orders', () => {
    component.orders.set(mockOrders);
    
    // Filter to show only open (PENDING/PARTIAL)
    component.filterStatus = 'open';
    component.updateGridView();
    
    expect(component.gridView.data.length).toBe(1);
    expect(component.gridView.data[0].status).toBe('PENDING');
  });

  it('should cancel order locally in stub mode', async () => {
    // Set stub mode
    component.isStubMode.set(true);
    component.orders.set(mockOrders);
    
    const orderToCancel = mockOrders[1]; // PENDING order
    
    await component.cancelOrder(orderToCancel);
    
    // Should NOT call API
    expect(mockOrderApiService.cancelOrder).not.toHaveBeenCalled();
    
    // Should update status locally
    const updatedOrder = component.orders().find(o => o.orderId === orderToCancel.orderId);
    expect(updatedOrder?.status).toBe('CANCELLED');
  });

  it('should cancel order via API in real mode', async () => {
    // Set real mode
    component.isStubMode.set(false);
    component.orders.set(mockOrders);
    
    const orderToCancel = mockOrders[1]; // PENDING order
    
    await component.cancelOrder(orderToCancel);
    
    // Should call API
    expect(mockOrderApiService.cancelOrder).toHaveBeenCalledWith(
      orderToCancel.orderId,
      orderToCancel.exchangeId
    );
  });

  it('should use configuration for stub data IDs', () => {
    component.loadStubData();
    
    const orders = component.orders();
    
    // Verify all orders use configured IDs
    orders.forEach(order => {
      expect(order.exchangeId).toBe(testConfig.exchangeId);
      expect(order.portfolioId).toBe(testConfig.portfolioId);
      expect(order.orderId).toContain(testConfig.orderIdPrefix || 'demo-order');
    });
  });

  it('should use configuration for API query', async () => {
    await component.loadOrders();
    
    // Verify API was called with configured exchangeId
    expect(mockOrderApiService.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        exchangeId: testConfig.exchangeId
      })
    );
  });
});




