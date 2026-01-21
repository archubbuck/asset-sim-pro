import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor, ProblemDetails } from './error.interceptor';
import { ErrorNotificationService } from './error-notification.service';

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
    
    // Spy on the service method
    jest.spyOn(errorNotificationService, 'showError');
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should intercept RFC 7807 Problem Details error', (done) => {
    const problemDetails: ProblemDetails = {
      type: 'https://assetsim.com/errors/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: 'Invalid request body',
    };

    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed'),
      error: (error) => {
        expect(error).toEqual(problemDetails);
        expect(errorNotificationService.showError).toHaveBeenCalledWith(
          'Validation Error',
          'Invalid request body'
        );
        done();
      },
    });

    const req = httpTestingController.expectOne('/api/test');
    req.flush(problemDetails, { status: 400, statusText: 'Bad Request' });
  });

  it('should handle non-RFC 7807 errors', (done) => {
    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(500);
        expect(errorNotificationService.showError).toHaveBeenCalledWith(
          'Error 500',
          'An unexpected error occurred'
        );
        done();
      },
    });

    const req = httpTestingController.expectOne('/api/test');
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should handle network errors', (done) => {
    httpClient.get('/api/test').subscribe({
      next: () => fail('should have failed'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(0);
        expect(errorNotificationService.showError).toHaveBeenCalled();
        done();
      },
    });

    const req = httpTestingController.expectOne('/api/test');
    req.error(new ProgressEvent('error'));
  });

  it('should parse RFC 7807 with instance field', (done) => {
    const problemDetails: ProblemDetails = {
      type: 'https://assetsim.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: 'Order not found',
      instance: '/orders/123',
    };

    httpClient.get('/api/orders/123').subscribe({
      next: () => fail('should have failed'),
      error: (error: ProblemDetails) => {
        expect(error.instance).toBe('/orders/123');
        done();
      },
    });

    const req = httpTestingController.expectOne('/api/orders/123');
    req.flush(problemDetails, { status: 404, statusText: 'Not Found' });
  });
});
