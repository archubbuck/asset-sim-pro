import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PositionBlotterComponent } from './position-blotter.component';
import { OrderApiService } from '@assetsim/shared/api-client';
import { of, throwError } from 'rxjs';
import { OrderResponse } from '@assetsim/shared/api-client';
import { NO_ERRORS_SCHEMA } from '@angular/core';

/**
 * PositionBlotterComponent tests
 */
describe('PositionBlotterComponent', () => {
  let component: PositionBlotterComponent;
  let fixture: ComponentFixture<PositionBlotterComponent>;
  let mockOrderApiService: Partial<OrderApiService>;

  const mockOrders: OrderResponse[] = [
    {
      orderId: 'ord-001',
      exchangeId: 'demo-exchange-001',
      portfolioId: 'demo-portfolio-001',
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
      exchangeId: 'demo-exchange-001',
      portfolioId: 'demo-portfolio-001',
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
        { provide: OrderApiService, useValue: mockOrderApiService }
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
});




