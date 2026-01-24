import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Trading } from './trading';
import { SignalRService } from '@assetsim/client/core';
import { signal } from '@angular/core';

/**
 * Trading component tests
 * 
 * Tests for the main Trading container component and its widget composition.
 */
describe('Trading', () => {
  let component: Trading;
  let fixture: ComponentFixture<Trading>;
  let mockSignalRService: jasmine.SpyObj<SignalRService>;

  beforeEach(async () => {
    // Create mock SignalR service
    mockSignalRService = jasmine.createSpyObj('SignalRService', ['connect'], {
      isConnected: signal(false),
      latestPrices: signal(new Map()),
      connectionState: signal('Disconnected'),
      currentExchangeId: signal(null)
    });

    await TestBed.configureTestingModule({
      imports: [Trading],
      providers: [
        { provide: SignalRService, useValue: mockSignalRService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Trading);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the trading desk name', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.trading-title');
    
    expect(title?.textContent).toContain('Live Trading Terminal');
  });

  it('should display connection status', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const statusText = compiled.querySelector('.status-text');
    
    expect(statusText?.textContent).toBeTruthy();
  });

  it('should render order entry widget', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const orderEntry = compiled.querySelector('app-order-entry');
    
    expect(orderEntry).toBeTruthy();
  });

  it('should render position blotter widget', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const blotter = compiled.querySelector('app-position-blotter');
    
    expect(blotter).toBeTruthy();
  });

  it('should render financial chart widget', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const chart = compiled.querySelector('app-financial-chart');
    
    expect(chart).toBeTruthy();
  });

  it('should attempt to connect to SignalR on init', async () => {
    mockSignalRService.connect.and.returnValue(Promise.resolve());
    
    await component.ngOnInit();
    
    expect(mockSignalRService.connect).toHaveBeenCalledWith('demo-exchange-001');
  });

  it('should handle SignalR connection failure gracefully', async () => {
    mockSignalRService.connect.and.returnValue(Promise.reject(new Error('Connection failed')));
    
    // Should not throw
    await expectAsync(component.ngOnInit()).toBeResolved();
  });
});

