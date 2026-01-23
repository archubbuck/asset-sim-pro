import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// Polyfill for $localize required by Kendo Angular components
declare global {
  var $localize: any;
}

if (typeof global.$localize === 'undefined') {
  global.$localize = (strings: TemplateStringsArray, ...values: readonly any[]) => {
    return strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
  };
}

