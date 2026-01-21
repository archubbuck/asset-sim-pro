import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorNotificationService } from './error-notification.service';
import { ProblemDetails, ErrorTypes } from '@assetsim/shared/finance-models';

describe('ErrorNotificationService', () => {
  let service: ErrorNotificationService;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErrorNotificationService);

    // Spy on console methods
    consoleErrorSpy = spyOn(console, 'error');
    consoleWarnSpy = spyOn(console, 'warn');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('handleError', () => {
    it('should handle validation error with field details', () => {
      const problemDetails: ProblemDetails = {
        type: ErrorTypes.VALIDATION_ERROR,
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid request body',
        errors: [
          { path: ['email'], message: 'Invalid email format' },
          { path: ['password'], message: 'Password too short' },
        ],
      };

      service.handleError(problemDetails);

      expect(consoleErrorSpy).toHaveBeenCalledWith('API Error:', problemDetails);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle unauthorized error', () => {
      const problemDetails: ProblemDetails = {
        type: ErrorTypes.UNAUTHORIZED,
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
      };

      service.handleError(problemDetails);

      expect(consoleErrorSpy).toHaveBeenCalledWith('API Error:', problemDetails);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle forbidden error', () => {
      const problemDetails: ProblemDetails = {
        type: ErrorTypes.FORBIDDEN,
        title: 'Forbidden',
        status: 403,
        detail: 'You do not have permission',
      };

      service.handleError(problemDetails);

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle not found error', () => {
      const problemDetails: ProblemDetails = {
        type: ErrorTypes.NOT_FOUND,
        title: 'Not Found',
        status: 404,
        detail: 'Resource not found',
      };

      service.handleError(problemDetails);

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle insufficient funds error with specific detail', () => {
      const problemDetails: ProblemDetails = {
        type: ErrorTypes.INSUFFICIENT_FUNDS,
        title: 'Insufficient Funds',
        status: 400,
        detail: 'Order value $50,000 exceeds buying power $10,000.',
      };

      service.handleError(problemDetails);

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle service unavailable error', () => {
      const problemDetails: ProblemDetails = {
        type: ErrorTypes.SERVICE_UNAVAILABLE,
        title: 'Service Unavailable',
        status: 503,
        detail: 'Database connection error',
      };

      service.handleError(problemDetails);

      expect(consoleErrorSpy).toHaveBeenCalledWith('API Error:', problemDetails);
      expect(consoleErrorSpy.calls.count()).toBeGreaterThan(1);
    });

    it('should handle internal server error', () => {
      const problemDetails: ProblemDetails = {
        type: ErrorTypes.INTERNAL_ERROR,
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred',
      };

      service.handleError(problemDetails);

      expect(consoleErrorSpy.calls.count()).toBeGreaterThan(0);
    });

    it('should handle unknown error type with detail', () => {
      const problemDetails: ProblemDetails = {
        type: 'https://assetsim.com/errors/custom-error',
        title: 'Custom Error',
        status: 400,
        detail: 'Custom error detail message',
      };

      service.handleError(problemDetails);

      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('handleGenericError', () => {
    it('should handle 400 Bad Request', () => {
      const error = new HttpErrorResponse({ status: 400, statusText: 'Bad Request' });

      service.handleGenericError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('HTTP Error:', error);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle 401 Unauthorized', () => {
      const error = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });

      service.handleGenericError(error);

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle 500 Internal Server Error', () => {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });

      service.handleGenericError(error);

      expect(consoleErrorSpy.calls.count()).toBeGreaterThan(0);
    });

    it('should handle unknown status code', () => {
      const error = new HttpErrorResponse({ status: 418, statusText: "I'm a teapot" });

      service.handleGenericError(error);

      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});
