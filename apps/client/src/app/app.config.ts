import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { appRoutes } from './app.routes';

/**
 * Application Configuration for AssetSim Pro
 * 
 * Following ADR-004:
 * - Zoneless change detection for performance and future-readiness
 * - Angular Signals-first approach (implemented in components)
 * - Kendo UI for Angular support via animations provider
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless change detection - signals-based reactivity
    provideZonelessChangeDetection(),
    
    // Router configuration
    provideRouter(appRoutes),
    
    // Animations required for Kendo UI components
    provideAnimations(),
    
    // HTTP client with fetch API and legacy interceptor support
    provideHttpClient(
      withFetch(),
      withInterceptorsFromDi()
    ),
  ],
};
