import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderEntryComponent } from './order-entry.component';
import { OrderApiService } from '@assetsim/shared/api-client';
import { SignalRService } from '@assetsim/client/core';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

/**
 * OrderEntryComponent tests
 */
describe('OrderEntryComponent', () => {
  let component: OrderEntryComponent;
  let fixture: ComponentFixture<OrderEntryComponent>;
  let mockOrderApiService: Partial<OrderApiService>;
  let mockSignalRService: Partial<SignalRService>;

  beforeEach(async () => {
    // Create mocks
    mockOrderApiService = {
      createOrder: jest.fn().mockReturnValue(of({
        orderId: 'test-order-123',
        exchangeId: 'demo-exchange-001',
        portfolioId: 'demo-portfolio-001',
        symbol: 'AAPL',
        side: 'BUY' as const,
        orderType: 'MARKET' as const,
        quantity: 100,
        status: 'PENDING' as const,
        filledQuantity: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    };
    
    mockSignalRService = {
      isConnected: signal(true),
      latestPrices: signal(new Map([
        ['AAPL', { exchangeId: 'demo', symbol: 'AAPL', price: 178.50, change: 1.25, changePercent: 0.70, volume: 1000000, timestamp: new Date().toISOString() }]
      ]))
    };

    await TestBed.configureTestingModule({
      imports: [OrderEntryComponent],
      providers: [
        { provide: OrderApiService, useValue: mockOrderApiService },
        { provide: SignalRService, useValue: mockSignalRService }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore Kendo UI component templates in tests
    }).compileComponents();

    fixture = TestBed.createComponent(OrderEntryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default form values', () => {
    expect(component.orderForm.symbol).toBe('AAPL');
    expect(component.orderForm.side).toBe('BUY');
    expect(component.orderForm.orderType).toBe('MARKET');
    expect(component.orderForm.quantity).toBe(100);
  });

  it('should display current price from SignalR', () => {
    const currentPrice = component.currentPrice();
    expect(currentPrice).toBe(178.50);
  });

  it('should validate form correctly', () => {
    // Valid MARKET order
    component.orderForm = {
      symbol: 'AAPL',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 100
    };
    expect(component.isFormValid()).toBe(true);

    // Invalid - missing symbol
    component.orderForm.symbol = '';
    expect(component.isFormValid()).toBe(false);
  });

  it('should reset form', () => {
    component.orderForm.symbol = 'MSFT';
    component.orderForm.quantity = 200;
    component.statusMessage.set('Test message');

    component.resetForm();

    expect(component.orderForm.symbol).toBe('AAPL');
    expect(component.orderForm.quantity).toBe(100);
    expect(component.statusMessage()).toBeNull();
  });
});




