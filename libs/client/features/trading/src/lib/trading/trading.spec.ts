import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Trading } from './trading';
import { SignalRService, LoggerService } from '@assetsim/client/core';
import { signal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';

/**
 * Trading component tests
 * 
 * Tests for the main Trading container component and its widget composition.
 */
describe('Trading', () => {
  let component: Trading;
  let fixture: ComponentFixture<Trading>;
  let mockSignalRService: Partial<SignalRService>;
  let mockLoggerService: Partial<LoggerService>;

  beforeEach(async () => {
    // Create mock SignalR service
    mockSignalRService = {
      isConnected: signal(false),
      latestPrices: signal(new Map()),
      connectionState: signal('Disconnected' as any),
      currentExchangeId: signal(null),
      connect: jest.fn().mockResolvedValue(undefined)
    };

    // Create mock Logger service
    mockLoggerService = {
      logException: jest.fn(),
      logEvent: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [Trading],
      providers: [
        { provide: SignalRService, useValue: mockSignalRService },
        { provide: LoggerService, useValue: mockLoggerService }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignore child component templates in tests
    }).compileComponents();

    fixture = TestBed.createComponent(Trading);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a trading desk name', () => {
    expect(component.deskName()).toBe('Live Trading Terminal');
  });

  it('should expose connection status from SignalR', () => {
    expect(component.isConnected()).toBe(false);
  });

  it('should attempt to connect to SignalR on init', async () => {
    await component.ngOnInit();
    
    expect(mockSignalRService.connect).toHaveBeenCalledWith('demo-exchange-001');
  });

  it('should handle SignalR connection failure gracefully', async () => {
    mockSignalRService.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));
    
    // Should not throw
    await expect(component.ngOnInit()).resolves.not.toThrow();
  });
});





