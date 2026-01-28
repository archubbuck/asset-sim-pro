import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { KENDO_LICENSE } from './environments/environment';
import { setScriptKey } from '@progress/kendo-licensing';

// Initialize Kendo UI License
// The license key is loaded from environment variables at build time
// See apps/client/src/environments/environment.ts for configuration details
if (KENDO_LICENSE) {
  setScriptKey(KENDO_LICENSE);
}

// Polyfill for $localize required by Kendo Angular components
if (typeof (window as any).$localize === 'undefined') {
  (window as any).$localize = (strings: TemplateStringsArray, ...values: readonly any[]) => {
    return strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
  };
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
