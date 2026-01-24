import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// Polyfill for $localize required by Kendo Angular components
declare global {
  var $localize: any;
}

if (typeof (globalThis as any).$localize === 'undefined') {
  (globalThis as any).$localize = (strings: TemplateStringsArray, ...values: readonly any[]) => {
    return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
  };
}

