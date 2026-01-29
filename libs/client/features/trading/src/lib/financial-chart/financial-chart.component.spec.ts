import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinancialChartComponent } from './financial-chart.component';
import { SignalRService } from '@assetsim/client/core';
import { signal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';

/**
 * FinancialChartComponent tests
 */
describe('FinancialChartComponent', () => {
  let component: FinancialChartComponent;
  let fixture: ComponentFixture<FinancialChartComponent>;
  let mockSignalRService: Partial<SignalRService>;

  beforeEach(async () => {
    mockSignalRService = {
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
    };

    await TestBed.configureTestingModule({
      imports: [FinancialChartComponent],
      providers: [
        { provide: SignalRService, useValue: mockSignalRService }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore Kendo UI component templates in tests
    }).compileComponents();

    fixture = TestBed.createComponent(FinancialChartComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Ensure component cleanup
    if (component) {
      component.ngOnDestroy();
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default symbol', () => {
    expect(component.selectedSymbol()).toBe('AAPL');
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

  it('should have symbol dropdown with options', () => {
    expect(component.symbolOptions.length).toBeGreaterThan(0);
    expect(component.symbolOptions).toContain('AAPL');
    expect(component.symbolOptions).toContain('MSFT');
  });
});


