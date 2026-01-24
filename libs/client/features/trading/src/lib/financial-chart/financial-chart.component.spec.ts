import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinancialChartComponent } from './financial-chart.component';
import { SignalRService } from '@assetsim/client/core';
import { signal } from '@angular/core';

/**
 * FinancialChartComponent tests
 */
describe('FinancialChartComponent', () => {
  let component: FinancialChartComponent;
  let fixture: ComponentFixture<FinancialChartComponent>;
  let mockSignalRService: jasmine.SpyObj<SignalRService>;

  beforeEach(async () => {
    mockSignalRService = jasmine.createSpyObj('SignalRService', [], {
      isConnected: signal(true),
      latestPrices: signal(new Map([
        ['AAPL', { 
          exchangeId: 'demo', 
          symbol: 'AAPL', 
          price: 178.50, 
          change: 1.25, 
          changePercent: 0.70, 
          volume: 1000000, 
          timestamp: new Date().toISOString() 
        }]
      ]))
    });

    await TestBed.configureTestingModule({
      imports: [FinancialChartComponent],
      providers: [
        { provide: SignalRService, useValue: mockSignalRService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FinancialChartComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Clean up interval
    component.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display widget title', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.widget-title');
    
    expect(title?.textContent).toContain('Financial Chart');
  });

  it('should have default symbol', () => {
    expect(component.selectedSymbol).toBe('AAPL');
  });

  it('should generate stub OHLC data', () => {
    const data = component.generateStubOHLCData('AAPL', 10);
    
    expect(data.length).toBe(11); // 10 + 1 current
    expect(data[0].open).toBeGreaterThan(0);
    expect(data[0].high).toBeGreaterThanOrEqual(data[0].open);
    expect(data[0].high).toBeGreaterThanOrEqual(data[0].close);
    expect(data[0].low).toBeLessThanOrEqual(data[0].open);
    expect(data[0].low).toBeLessThanOrEqual(data[0].close);
  });

  it('should load chart data on init', () => {
    component.ngOnInit();
    
    expect(component.chartData().length).toBeGreaterThan(0);
    expect(component.latestPrice()).toBeGreaterThan(0);
  });

  it('should update latest price from SignalR', (done) => {
    component.ngOnInit();
    fixture.detectChanges();

    // Wait for real-time update to trigger
    setTimeout(() => {
      const latestPrice = component.latestPrice();
      expect(latestPrice).toBe(178.50);
      done();
    }, 1500);
  });

  it('should change symbol and reload data', () => {
    component.ngOnInit();
    const initialSymbol = component.selectedSymbol;
    const initialData = component.chartData();

    component.selectedSymbol = 'MSFT';
    component.onSymbolChange();

    expect(component.chartData()).not.toEqual(initialData);
  });

  it('should refresh data', () => {
    component.ngOnInit();
    const initialData = component.chartData();

    component.refreshData();

    // Data should be regenerated (different random values)
    expect(component.chartData().length).toBe(initialData.length);
  });

  it('should update chart with new price', () => {
    component.loadChartData();
    const initialLength = component.chartData().length;
    const lastCandle = component.chartData()[initialLength - 1];

    // Update with new price
    const newPrice = lastCandle.close + 1.0;
    component.updateChartWithNewPrice(newPrice);

    const updatedData = component.chartData();
    const updatedLastCandle = updatedData[updatedData.length - 1];

    // High should be updated if new price is higher
    expect(updatedLastCandle.high).toBeGreaterThanOrEqual(lastCandle.high);
    expect(updatedLastCandle.close).toBe(newPrice);
  });

  it('should display price ticker when price available', () => {
    component.latestPrice.set(178.50);
    component.priceChange.set(0.70);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const priceTicker = compiled.querySelector('.price-ticker');
    
    expect(priceTicker).toBeTruthy();
  });

  it('should show chart containers', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const chartContainers = compiled.querySelectorAll('.chart-container');
    
    // Should have price chart and volume chart
    expect(chartContainers.length).toBe(2);
  });

  it('should have symbol dropdown with options', () => {
    expect(component.symbolOptions.length).toBeGreaterThan(0);
    expect(component.symbolOptions).toContain('AAPL');
    expect(component.symbolOptions).toContain('MSFT');
  });
});
