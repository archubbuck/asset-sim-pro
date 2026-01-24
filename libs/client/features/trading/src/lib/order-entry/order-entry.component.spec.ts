import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderEntryComponent } from './order-entry.component';
import { OrderApiService } from '@assetsim/shared/api-client';
import { SignalRService } from '@assetsim/client/core';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

/**
 * OrderEntryComponent tests
 */
describe('OrderEntryComponent', () => {
  let component: OrderEntryComponent;
  let fixture: ComponentFixture<OrderEntryComponent>;
  let mockOrderApiService: jasmine.SpyObj<OrderApiService>;
  let mockSignalRService: jasmine.SpyObj<SignalRService>;

  beforeEach(async () => {
    // Create mocks
    mockOrderApiService = jasmine.createSpyObj('OrderApiService', ['createOrder']);
    mockSignalRService = jasmine.createSpyObj('SignalRService', [], {
      isConnected: signal(true),
      latestPrices: signal(new Map([
        ['AAPL', { exchangeId: 'demo', symbol: 'AAPL', price: 178.50, change: 1.25, changePercent: 0.70, volume: 1000000, timestamp: new Date().toISOString() }]
      ]))
    });

    await TestBed.configureTestingModule({
      imports: [OrderEntryComponent],
      providers: [
        { provide: OrderApiService, useValue: mockOrderApiService },
        { provide: SignalRService, useValue: mockSignalRService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display widget title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.widget-title');
    
    expect(title?.textContent).toContain('Order Entry');
  });

  it('should have default form values', () => {
    expect(component.orderForm.symbol).toBe('AAPL');
    expect(component.orderForm.side).toBe('BUY');
    expect(component.orderForm.orderType).toBe('MARKET');
    expect(component.orderForm.quantity).toBe(100);
  });

  it('should display current price from SignalR', () => {
    fixture.detectChanges();
    
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

    // Invalid LIMIT order - missing price
    component.orderForm = {
      symbol: 'AAPL',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 100
    };
    expect(component.isFormValid()).toBe(false);

    // Valid LIMIT order
    component.orderForm.price = 180.00;
    expect(component.isFormValid()).toBe(true);
  });

  it('should submit order successfully', async () => {
    const mockResponse = {
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
    };

    mockOrderApiService.createOrder.and.returnValue(of(mockResponse));

    await component.submitOrder();

    expect(mockOrderApiService.createOrder).toHaveBeenCalled();
    expect(component.statusType()).toBe('success');
    expect(component.statusMessage()).toContain('test-order-123');
  });

  it('should handle order submission error', async () => {
    mockOrderApiService.createOrder.and.returnValue(
      throwError(() => new Error('API error'))
    );

    await component.submitOrder();

    expect(component.statusType()).toBe('error');
    expect(component.statusMessage()).toContain('Failed to place order');
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

  it('should show limit price field for LIMIT orders', () => {
    component.orderForm.orderType = 'LIMIT';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const limitPriceFields = Array.from(compiled.querySelectorAll('kendo-label'))
      .filter(label => label.textContent?.includes('Limit Price'));
    
    expect(limitPriceFields.length).toBeGreaterThan(0);
  });

  it('should show stop price field for STOP orders', () => {
    component.orderForm.orderType = 'STOP';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const stopPriceFields = Array.from(compiled.querySelectorAll('kendo-label'))
      .filter(label => label.textContent?.includes('Stop Price'));
    
    expect(stopPriceFields.length).toBeGreaterThan(0);
  });
});
