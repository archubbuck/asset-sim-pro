import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { MarketDepthComponent } from '../market-depth/market-depth.component';
import { RiskMatrixComponent } from '../risk-matrix/risk-matrix.component';
import { NewsTerminalComponent } from '../news-terminal/news-terminal.component';
import { FeatureService } from '@assetsim/client/core';
import { signal, computed } from '@angular/core';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockFeatureService: jest.Mocked<FeatureService>;

  beforeEach(async () => {
    // Create mock FeatureService
    const mockState = signal({
      flags: {},
      configuration: {
        initialAum: 10000000,
        commissionBps: 5,
        allowMargin: true,
        volatilityIndex: 1.0,
        dashboardLayout: ['market-depth', 'risk-matrix', 'news-terminal']
      }
    });

    mockFeatureService = {
      flags: computed(() => mockState().flags),
      config: computed(() => mockState().configuration),
      loadFeatures: jest.fn(),
      isEnabled: jest.fn()
    } as unknown as jest.Mocked<FeatureService>;

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: FeatureService, useValue: mockFeatureService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display desk name', () => {
    expect(component.deskName()).toBe('Alpha Strategy Fund I');
  });

  it('should get layout from feature service configuration', () => {
    const layout = component.layout();
    expect(layout).toEqual(['market-depth', 'risk-matrix', 'news-terminal']);
  });

  it('should render all three widgets', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const widgets = compiled.querySelectorAll('.widget');
    expect(widgets.length).toBe(3);
  });

  it('should display Trading Desk title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h2');
    expect(title?.textContent).toContain('Trading Desk: Alpha Strategy Fund I');
  });
});

describe('MarketDepthComponent', () => {
  let component: MarketDepthComponent;
  let fixture: ComponentFixture<MarketDepthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketDepthComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MarketDepthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display market depth title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('L2 Market Depth');
  });
});

describe('RiskMatrixComponent', () => {
  let component: RiskMatrixComponent;
  let fixture: ComponentFixture<RiskMatrixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskMatrixComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RiskMatrixComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display risk matrix title and VaR', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Risk Matrix');
    expect(compiled.textContent).toContain('1.2%');
  });
});

describe('NewsTerminalComponent', () => {
  let component: NewsTerminalComponent;
  let fixture: ComponentFixture<NewsTerminalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsTerminalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(NewsTerminalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display news terminal title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('News Terminal');
    expect(compiled.textContent).toContain('Bloomberg Feed');
  });
});
