import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

/**
 * Test-only subclass that exposes protected methods as public
 * for testing purposes without bypassing TypeScript access modifiers
 */
@Injectable()
class TestableBaseApiService extends BaseApiService {
  public override get<T>(url: string): Observable<T> {
    return super.get<T>(url);
  }

  public override post<T>(url: string, body: unknown): Observable<T> {
    return super.post<T>(url, body);
  }

  public override put<T>(url: string, body: unknown): Observable<T> {
    return super.put<T>(url, body);
  }

  public override delete<T>(url: string): Observable<T> {
    return super.delete<T>(url);
  }
}

describe('BaseApiService', () => {
  let service: TestableBaseApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TestableBaseApiService]
    });
    service = TestBed.inject(TestableBaseApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should make GET request with correct URL', () => {
    const mockResponse = { data: 'test' };
    
    service.get('/test').subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/v1/test');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should make POST request with correct URL and body', () => {
    const mockBody = { name: 'test' };
    const mockResponse = { id: '123', name: 'test' };
    
    service.post('/test', mockBody).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/v1/test');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockBody);
    req.flush(mockResponse);
  });

  it('should make PUT request with correct URL and body', () => {
    const mockBody = { name: 'updated' };
    const mockResponse = { id: '123', name: 'updated' };
    
    service.put('/test', mockBody).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/v1/test');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(mockBody);
    req.flush(mockResponse);
  });

  it('should make DELETE request with correct URL', () => {
    service.delete('/test').subscribe();

    const req = httpMock.expectOne('/api/v1/test');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
