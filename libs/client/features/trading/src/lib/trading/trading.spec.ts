import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Trading } from './trading';
import { SignalRService, LoggerService } from '@assetsim/client/core';
import { signal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TRADING_STUB_CONFIG, TradingStubConfig } from '../models/trading-config';

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
  let mockConfig: TradingStubConfig;

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

    // Create mock trading config
    mockConfig = {
      exchangeId: 'test-exchange-id-123',
      portfolioId: 'test-portfolio-id-456'
    };

    await TestBed.configureTestingModule({
      imports: [Trading],
      providers: [
        { provide: SignalRService, useValue: mockSignalRService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: TRADING_STUB_CONFIG, useValue: mockConfig }
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

  it('should attempt to connect to SignalR on init with configured exchangeId', async () => {
    await component.ngOnInit();
    
    expect(mockSignalRService.connect).toHaveBeenCalledWith('test-exchange-id-123');
  });

  it('should handle SignalR connection failure gracefully', async () => {
    mockSignalRService.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));
    
    // Should not throw
    await expect(component.ngOnInit()).resolves.not.toThrow();
  });
});





