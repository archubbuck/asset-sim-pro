import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Polyfill for $localize required by Kendo Angular components
if (typeof (window as any).$localize === 'undefined') {
  (window as any).$localize = (strings: TemplateStringsArray, ...values: readonly any[]) => {
    return strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
  };
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
