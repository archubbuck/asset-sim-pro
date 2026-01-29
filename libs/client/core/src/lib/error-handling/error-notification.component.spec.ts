import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorNotificationComponent } from './error-notification.component';
import { ErrorNotificationService } from './error-notification.service';

describe('ErrorNotificationComponent', () => {
  let component: ErrorNotificationComponent;
  let fixture: ComponentFixture<ErrorNotificationComponent>;
  let errorService: ErrorNotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorNotificationComponent],
      providers: [ErrorNotificationService],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorNotificationComponent);
    component = fixture.componentInstance;
    errorService = TestBed.inject(ErrorNotificationService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render error notification when error is added', () => {
    errorService.showError('Test Error', 'This is a test error message');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const errorNotification = compiled.querySelector('.error-notification');
    
    expect(errorNotification).toBeTruthy();
    expect(errorNotification?.querySelector('.error-title')?.textContent).toBe('Test Error');
    expect(errorNotification?.querySelector('.error-message')?.textContent).toBe('This is a test error message');
  });

  it('should render multiple error notifications', () => {
    errorService.showError('Error 1', 'First error');
    errorService.showError('Error 2', 'Second error');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const errorNotifications = compiled.querySelectorAll('.error-notification');
    
    expect(errorNotifications.length).toBe(2);
  });

  it('should dismiss error when close button is clicked', () => {
    errorService.showError('Test Error', 'This is a test error message');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const closeButton = compiled.querySelector('.error-close') as HTMLButtonElement;
    
    expect(closeButton).toBeTruthy();
    
    closeButton.click();
    fixture.detectChanges();

    const errorNotification = compiled.querySelector('.error-notification');
    expect(errorNotification).toBeFalsy();
  });

  it('should format timestamp correctly', () => {
    const testDate = new Date('2026-01-21T12:00:00');
    const formattedTime = component.formatTime(testDate);
    
    expect(formattedTime).toBeTruthy();
    expect(typeof formattedTime).toBe('string');
    expect(formattedTime).toContain(':');
  });

  it('should have correct accessibility attributes', () => {
    errorService.showError('Test Error', 'This is a test error message');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const errorNotification = compiled.querySelector('.error-notification');
    const closeButton = compiled.querySelector('.error-close');
    
    expect(errorNotification?.getAttribute('role')).toBe('alert');
    expect(closeButton?.getAttribute('aria-label')).toBe('Close notification');
  });

  it('should display timestamp in error notification', () => {
    errorService.showError('Test Error', 'This is a test error message');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const timeElement = compiled.querySelector('.error-time');
    
    expect(timeElement).toBeTruthy();
    expect(timeElement?.textContent).toBeTruthy();
  });

  it('should not render any notifications when there are no errors', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const errorNotifications = compiled.querySelectorAll('.error-notification');
    
    expect(errorNotifications.length).toBe(0);
  });

  it('should have proper CSS classes for styling', () => {
    errorService.showError('Test Error', 'This is a test error message');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    
    expect(compiled.querySelector('.error-notifications-container')).toBeTruthy();
    expect(compiled.querySelector('.error-notification')).toBeTruthy();
    expect(compiled.querySelector('.error-header')).toBeTruthy();
    expect(compiled.querySelector('.error-title')).toBeTruthy();
    expect(compiled.querySelector('.error-message')).toBeTruthy();
    expect(compiled.querySelector('.error-time')).toBeTruthy();
    expect(compiled.querySelector('.error-close')).toBeTruthy();
  });
});
