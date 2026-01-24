import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PositionBlotterComponent } from './position-blotter.component';
import { OrderApiService } from '@assetsim/shared/api-client';
import { of, throwError } from 'rxjs';
import { OrderResponse } from '@assetsim/shared/api-client';

/**
 * PositionBlotterComponent tests
 */
describe('PositionBlotterComponent', () => {
  let component: PositionBlotterComponent;
  let fixture: ComponentFixture<PositionBlotterComponent>;
  let mockOrderApiService: jasmine.SpyObj<OrderApiService>;

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
    mockOrderApiService = jasmine.createSpyObj('OrderApiService', [
      'listOrders',
      'cancelOrder'
    ]);

    await TestBed.configureTestingModule({
      imports: [PositionBlotterComponent],
      providers: [
        { provide: OrderApiService, useValue: mockOrderApiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PositionBlotterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display widget title', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.widget-title');
    
    expect(title?.textContent).toContain('Position Blotter');
  });

  it('should load orders on init', async () => {
    mockOrderApiService.listOrders.and.returnValue(of(mockOrders));

    await component.ngOnInit();
    fixture.detectChanges();

    expect(mockOrderApiService.listOrders).toHaveBeenCalled();
    expect(component.orders().length).toBe(2);
  });

  it('should load stub data on API error', async () => {
    mockOrderApiService.listOrders.and.returnValue(
      throwError(() => new Error('API error'))
    );

    await component.ngOnInit();
    fixture.detectChanges();

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

  it('should handle page change', () => {
    const manyOrders: OrderResponse[] = [];
    for (let i = 0; i < 25; i++) {
      manyOrders.push({
        ...mockOrders[0],
        orderId: `ord-${i}`
      });
    }
    component.orders.set(manyOrders);
    component.updateGridView();

    const initialData = component.gridView.data.length;
    
    // Change page
    component.pageChange({ skip: 10, take: 10 });
    
    expect(component.skip).toBe(10);
    expect(component.gridView.data.length).toBe(10);
  });

  it('should refresh orders', async () => {
    mockOrderApiService.listOrders.and.returnValue(of(mockOrders));
    
    component.refreshOrders();
    
    expect(mockOrderApiService.listOrders).toHaveBeenCalled();
  });

  it('should cancel order', async () => {
    const orderToCancel = mockOrders[1]; // PENDING order
    mockOrderApiService.cancelOrder.and.returnValue(of({
      ...orderToCancel,
      status: 'CANCELLED'
    }));
    mockOrderApiService.listOrders.and.returnValue(of(mockOrders));

    await component.cancelOrder(orderToCancel);

    expect(mockOrderApiService.cancelOrder).toHaveBeenCalledWith(
      orderToCancel.orderId,
      orderToCancel.exchangeId
    );
  });

  it('should handle cancel order error', async () => {
    const orderToCancel = mockOrders[1];
    mockOrderApiService.cancelOrder.and.returnValue(
      throwError(() => new Error('Cancel failed'))
    );

    await component.cancelOrder(orderToCancel);

    expect(component.errorMessage()).toContain('Failed to cancel order');
  });

  it('should display grid with orders', async () => {
    mockOrderApiService.listOrders.and.returnValue(of(mockOrders));
    
    await component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const grid = compiled.querySelector('kendo-grid');
    
    expect(grid).toBeTruthy();
  });
});
