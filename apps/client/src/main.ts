import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { KENDO_LICENSE } from './environments/environment';
import { setScriptKey } from '@progress/kendo-licensing';

// Initialize Kendo UI License
// The license key is loaded from environment variables at build time
// See apps/client/src/environments/environment.ts for configuration details
const PLACEHOLDER = '__KENDO_UI_LICENSE__';
// Use string comparison to handle both compile-time and runtime values
if (KENDO_LICENSE && (KENDO_LICENSE as string) !== PLACEHOLDER) {
  setScriptKey(KENDO_LICENSE);
} else {
  // Note: Using console.warn directly here is acceptable because this code runs
  // during application bootstrap, before Angular's DI system is available.
  // LoggerService from @assetsim/client/core cannot be used in this context.
  console.warn('Kendo UI: Running in trial mode (license key not configured)');
}

// Polyfill for $localize required by Kendo Angular components
if (typeof (window as any).$localize === 'undefined') {
  (window as any).$localize = (strings: TemplateStringsArray, ...values: readonly any[]) => {
    return strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
  };
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
