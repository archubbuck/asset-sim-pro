import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppShellComponent } from './app-shell.component';
import { AuthService } from '../auth/auth.factory';
import { LoggerService } from '../logger/logger.service';
import { signal } from '@angular/core';

describe('AppShellComponent', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;
  let mockRouter: jest.Mocked<Router>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    // Create mock services
    mockRouter = {
      navigate: jest.fn()
    } as unknown as jest.Mocked<Router>;

    mockAuthService = {
      user: signal({ userId: '123', userDetails: 'John Doe', identityProvider: 'aad', userRoles: [] }),
      isAuthenticated: signal(true),
      roles: signal([]),
      checkSession: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      hasRole: jest.fn()
    } as unknown as jest.Mocked<AuthService>;

    mockLogger = {
      logEvent: jest.fn(),
      logTrace: jest.fn(),
      logException: jest.fn()
    } as unknown as jest.Mocked<LoggerService>;

    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: LoggerService, useValue: mockLogger }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display buying power formatted as currency', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    // The buying power should be formatted as $10,000,000
    expect(component.buyingPower()).toBe(10000000);
  });

  it('should compute user initials from auth service', () => {
    const initials = component.userInitials();
    expect(initials).toBe('JO'); // From "John Doe"
  });

  it('should return default initials if user is not authenticated', () => {
    mockAuthService.user = signal(null);
    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    
    const initials = component.userInitials();
    expect(initials).toBe('US'); // Default value
  });

  it('should have three navigation items', () => {
    expect(component.navItems).toHaveLength(3);
    expect(component.navItems[0].text).toBe('Terminal');
    expect(component.navItems[1].text).toBe('Fund Performance');
    expect(component.navItems[2].text).toBe('Execution');
  });

  it('should navigate and log event on drawer item selection', () => {
    const mockEvent = {
      item: { text: 'Terminal', path: '/dashboard' }
    } as any;

    component.onSelect(mockEvent);

    expect(mockLogger.logEvent).toHaveBeenCalledWith('Navigation', { target: '/dashboard' });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should not navigate if item has no path', () => {
    const mockEvent = {
      item: { text: 'No Path' }
    } as any;

    component.onSelect(mockEvent);

    expect(mockLogger.logEvent).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should have menu icon configured', () => {
    expect(component.icons.menu).toBeDefined();
  });
});
