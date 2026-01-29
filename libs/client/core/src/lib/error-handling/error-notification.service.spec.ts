import { TestBed } from '@angular/core/testing';
import { ErrorNotificationService } from './error-notification.service';

describe('ErrorNotificationService', () => {
  let service: ErrorNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErrorNotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add error notification', () => {
    service.showError('Test Error', 'This is a test error message');
    
    expect(service.errors().length).toBe(1);
    expect(service.errors()[0].title).toBe('Test Error');
    expect(service.errors()[0].message).toBe('This is a test error message');
  });

  it('should dismiss error notification by id', () => {
    service.showError('Error 1', 'Message 1');
    service.showError('Error 2', 'Message 2');
    
    const firstErrorId = service.errors()[0].id;
    service.dismissError(firstErrorId);
    
    expect(service.errors().length).toBe(1);
    expect(service.errors()[0].title).toBe('Error 2');
  });

  it('should clear all errors', () => {
    service.showError('Error 1', 'Message 1');
    service.showError('Error 2', 'Message 2');
    service.showError('Error 3', 'Message 3');
    
    expect(service.errors().length).toBe(3);
    
    service.clearAll();
    
    expect(service.errors().length).toBe(0);
  });

  it('should auto-dismiss errors after 10 seconds', (done) => {
    jest.useFakeTimers();
    
    service.showError('Auto Dismiss', 'This should auto-dismiss');
    expect(service.errors().length).toBe(1);
    
    jest.advanceTimersByTime(10000);
    
    expect(service.errors().length).toBe(0);
    
    jest.useRealTimers();
    done();
  });

  it('should cleanup timer subscription when error is manually dismissed', () => {
    jest.useFakeTimers();
    
    service.showError('Test Error', 'This should be dismissed early');
    const errorId = service.errors()[0].id;
    
    // Manually dismiss before timer expires
    service.dismissError(errorId);
    
    expect(service.errors().length).toBe(0);
    
    // Advance time to verify timer doesn't fire after manual dismissal
    jest.advanceTimersByTime(10000);
    
    // Should still be 0, no additional side effects
    expect(service.errors().length).toBe(0);
    
    jest.useRealTimers();
  });

  it('should cleanup all timer subscriptions when clearAll is called', () => {
    jest.useFakeTimers();
    
    service.showError('Error 1', 'Message 1');
    service.showError('Error 2', 'Message 2');
    service.showError('Error 3', 'Message 3');
    
    expect(service.errors().length).toBe(3);
    
    // Clear all errors
    service.clearAll();
    
    expect(service.errors().length).toBe(0);
    
    // Advance time to verify timers don't fire after clearAll
    jest.advanceTimersByTime(10000);
    
    // Should still be 0, no additional side effects
    expect(service.errors().length).toBe(0);
    
    jest.useRealTimers();
  });
});
