import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

// Add $localize polyfill for Kendo UI
(global as any).$localize = (strings: TemplateStringsArray, ...values: any[]) => {
  return strings[0] + values.map((v, i) => v + (strings[i + 1] || '')).join('');
};

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});


