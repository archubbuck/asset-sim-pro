import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { errorInterceptor, provideAuthService } from '@assetsim/client/core';

/**
 * Application Configuration for AssetSim Pro
 * 
 * Following ADR-004:
 * - Zoneless change detection for performance and future-readiness
 * - Angular Signals-first approach (implemented in components)
 * - Kendo UI for Angular support via animations provider
 * 
 * Following ADR-018:
 * - RFC 7807 error handling with HTTP interceptor
 * 
 * Following ADR-020:
 * - Azure AD authentication with factory pattern for local development
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless change detection - signals-based reactivity
    provideZonelessChangeDetection(),
    
    // Router configuration
    provideRouter(appRoutes),
    
    // Animations required for Kendo UI components
    provideAnimations(),
    
    // HTTP client with fetch API and error interceptor (ADR-018)
    provideHttpClient(
      withFetch(),
      withInterceptors([errorInterceptor])
    ),
    
    // Authentication service with factory pattern (ADR-020)
    // Automatically uses MockAuthService for localhost, AzureAuthService for production
    provideAuthService(),
  ],
};
