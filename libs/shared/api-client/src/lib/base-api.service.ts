import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Base API Service
 * 
 * Provides common HTTP client functionality and base URL configuration
 * for all API services. All API calls go through Angular's HttpClient,
 * which automatically applies the error interceptor for centralized error handling.
 */
@Injectable({
  providedIn: 'root'
})
export class BaseApiService {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = '/api/v1';

  /**
   * Performs a GET request
   */
  protected get<T>(url: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${url}`);
  }

  /**
   * Performs a POST request
   */
  protected post<T>(url: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${url}`, body);
  }

  /**
   * Performs a PUT request
   */
  protected put<T>(url: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${url}`, body);
  }

  /**
   * Performs a DELETE request
   */
  protected delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${url}`);
  }
}
