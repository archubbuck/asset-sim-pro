import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
import { ErrorNotificationService } from '../services/error-notification.service';
import { ProblemDetails, ErrorTypes } from '@assetsim/shared/finance-models';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let errorNotificationService: ErrorNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        ErrorNotificationService,
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    errorNotificationService = TestBed.inject(ErrorNotificationService);
  });

  afterEach(() => {
    // Verify that no unmatched requests are outstanding
    httpTestingController.verify();
  });

  it('should intercept and handle RFC 7807 error response', (done) => {
    const problemDetails: ProblemDetails = {
      type: ErrorTypes.VALIDATION_ERROR,
      title: 'Validation Error',
      status: 400,
      detail: 'Invalid request body',
    };

    const handleErrorSpy = spyOn(errorNotificationService, 'handleError');

    // Make an HTTP request
    httpClient.get('/api/test').subscribe({
      next: () => {
        fail('Should have failed');
        done();
      },
      error: () => {
        // Verify the error was handled
        expect(handleErrorSpy).toHaveBeenCalledWith(problemDetails);
        done();
      },
    });

    // Respond with an error
    const req = httpTestingController.expectOne('/api/test');
    req.flush(problemDetails, { status: 400, statusText: 'Bad Request' });
  });

  it('should handle RFC 7807 insufficient funds error', (done) => {
    const problemDetails: ProblemDetails = {
      type: ErrorTypes.INSUFFICIENT_FUNDS,
      title: 'Insufficient Funds',
      status: 400,
      detail: 'Order value $50,000 exceeds buying power $10,000.',
      instance: '/orders/123',
    };

    const handleErrorSpy = spyOn(errorNotificationService, 'handleError');

    httpClient.post('/api/orders', {}).subscribe({
      next: () => {
        fail('Should have failed');
        done();
      },
      error: () => {
        expect(handleErrorSpy).toHaveBeenCalledWith(problemDetails);
        done();
      },
    });

    const req = httpTestingController.expectOne('/api/orders');
    req.flush(problemDetails, { status: 400, statusText: 'Bad Request' });
  });

  it('should handle RFC 7807 unauthorized error', (done) => {
    const problemDetails: ProblemDetails = {
      type: ErrorTypes.UNAUTHORIZED,
      title: 'Unauthorized',
      status: 401,
      detail: 'Authentication required',
    };

    const handleErrorSpy = spyOn(errorNotificationService, 'handleError');

    httpClient.get('/api/protected').subscribe({
      next: () => {
        fail('Should have failed');
        done();
      },
      error: () => {
        expect(handleErrorSpy).toHaveBeenCalledWith(problemDetails);
        done();
      },
    });

    const req = httpTestingController.expectOne('/api/protected');
    req.flush(problemDetails, { status: 401, statusText: 'Unauthorized' });
  });

  it('should handle RFC 7807 service unavailable error', (done) => {
    const problemDetails: ProblemDetails = {
      type: ErrorTypes.SERVICE_UNAVAILABLE,
      title: 'Service Unavailable',
      status: 503,
      detail: 'Database connection error',
    };

    const handleErrorSpy = spyOn(errorNotificationService, 'handleError');

    httpClient.get('/api/data').subscribe({
      next: () => {
        fail('Should have failed');
        done();
      },
      error: () => {
        expect(handleErrorSpy).toHaveBeenCalledWith(problemDetails);
        done();
      },
    });

    const req = httpTestingController.expectOne('/api/data');
    req.flush(problemDetails, { status: 503, statusText: 'Service Unavailable' });
  });

  it('should handle non-RFC 7807 error response', (done) => {
    const handleGenericErrorSpy = spyOn(errorNotificationService, 'handleGenericError');

    httpClient.get('/api/test').subscribe({
      next: () => {
        fail('Should have failed');
        done();
      },
      error: () => {
        expect(handleGenericErrorSpy).toHaveBeenCalled();
        done();
      },
    });

    const req = httpTestingController.expectOne('/api/test');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should handle network error', (done) => {
    const handleGenericErrorSpy = spyOn(errorNotificationService, 'handleGenericError');

    httpClient.get('/api/test').subscribe({
      next: () => {
        fail('Should have failed');
        done();
      },
      error: () => {
        expect(handleGenericErrorSpy).toHaveBeenCalled();
        done();
      },
    });

    const req = httpTestingController.expectOne('/api/test');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });
  });

  it('should pass through successful responses', (done) => {
    const expectedData = { id: 1, name: 'Test' };

    httpClient.get('/api/test').subscribe({
      next: (data) => {
        expect(data).toEqual(expectedData);
        done();
      },
      error: () => {
        fail('Should not have failed');
        done();
      },
    });

    const req = httpTestingController.expectOne('/api/test');
    req.flush(expectedData);
  });

  it('should re-throw error after handling', (done) => {
    const problemDetails: ProblemDetails = {
      type: ErrorTypes.VALIDATION_ERROR,
      title: 'Validation Error',
      status: 400,
      detail: 'Invalid request body',
    };

    httpClient.get('/api/test').subscribe({
      next: () => {
        fail('Should have failed');
        done();
      },
      error: (error) => {
        // The error should still be available to the component
        expect(error.error).toEqual(problemDetails);
        done();
      },
    });

    const req = httpTestingController.expectOne('/api/test');
    req.flush(problemDetails, { status: 400, statusText: 'Bad Request' });
  });
});
