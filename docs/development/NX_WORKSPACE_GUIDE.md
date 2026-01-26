# Nx Workspace Guide - AssetSim Pro

This document provides an overview of the Nx workspace structure and development workflow for AssetSim Pro, configured according to **ADR-004**.

## 📋 Overview

AssetSim Pro now uses an **Nx monorepo** architecture with Angular 21+ and Kendo UI for Angular, implementing a signals-first approach with zoneless change detection.

## 🏗️ Workspace Structure

```
asset-sim-pro/
├── apps/
│   ├── client/                      # Institutional Trading Portal (Angular)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── app.config.ts   # Zoneless config with Signals
│   │   │   │   ├── app.ts           # Root component with Signals
│   │   │   │   ├── app.html
│   │   │   │   ├── app.scss
│   │   │   │   └── app.routes.ts
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   └── styles.scss          # Kendo UI Institutional Slate theme
│   │   └── project.json
│   │
│   └── backend/                     # Azure Function App (Node.js/TypeScript)
│       ├── src/
│       │   ├── functions/
│       │   ├── lib/
│       │   └── types/
│       ├── host.json
│       └── package.json
│
├── libs/
│   ├── shared/
│   │   └── finance-models/          # Shared TypeScript types/models
│   │       ├── src/
│   │       │   ├── index.ts
│   │       │   └── lib/
│   │       └── project.json
│   │
│   └── client/
│       └── features/
│           └── trading/             # Trading execution logic (Angular)
│               ├── src/
│               │   ├── index.ts
│               │   └── lib/
│               └── project.json
│
├── nx.json                          # Nx workspace configuration
├── tsconfig.base.json               # Base TypeScript configuration
└── package.json                     # Root dependencies
```

## 🎯 ADR-004 Implementation

### ✅ Nx Workspace

- Monorepo structure with apps and libs
- Cacheable builds and tasks
- Dependency graph management

### ✅ Angular Configuration

- **Version**: Angular 21.1.0
- **Change Detection**: Zoneless (`provideZonelessChangeDetection()`)
- **Reactivity**: Signals-first approach
- **Standalone Components**: All components are standalone

### ✅ Kendo UI for Angular

- **Theme**: Institutional Slate (custom dark theme)
- **Components Available**:
  - Buttons, Charts, Grid, Inputs
  - Dialogs, Dropdowns, Layout
  - Navigation, Indicators
  - And more...

### ✅ Build System

- **Bundler**: esbuild (fast, modern)
- **Test Runner**: Vitest (shared libs), Jest (Angular libs)
- **Linter**: ESLint

## 🚀 Development Workflow

### Starting Development

```bash
# Install dependencies
npm install

# Start Angular development server
npm start
# or
nx serve client

# Start backend function app
npm run backend:start
```

### Building Applications

```bash
# Build client for production
npm run build:prod
# or
nx build client --configuration=production

# Build backend
npm run backend:build
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific project
nx test client
nx test finance-models
nx test trading
```

### Linting

```bash
# Lint all projects
npm run lint

# Lint specific project
nx lint client
nx lint trading
```

## 📦 Key Dependencies

### Angular & Nx

- `@angular/core`: 21.1.0 (with Signals support)
- `nx`: 22.3.3
- `@nx/angular`: 22.3.3

### Kendo UI for Angular

- `@progress/kendo-angular-*`: 22.0.1
- `@progress/kendo-theme-default`: 12.3.0
- `@progress/kendo-svg-icons`: 4.6.2

### Backend (Azure Functions)

- `@azure/functions`: 4.0.0
- `mssql`: 10.0.0
- `zod`: 3.22.0

## 🎨 Theming

The application uses a custom **Institutional Slate** theme built on top of Kendo UI's default theme:

- **Primary Color**: Dark slate (#1e293b)
- **Secondary Color**: Professional blue (#3b82f6)
- **Background**: Deep dark (#0f172a)
- **Text**: Light slate (#e2e8f0)

Theme customization is in `apps/client/src/styles.scss`.

## 📚 Library Usage

### Shared Finance Models

```typescript
// Import shared types
import { ExchangeConfig, Portfolio } from '@assetsim/shared/finance-models';
```

### Trading Features

```typescript
// Import trading components
import { TradingComponent } from '@assetsim/client/features/trading';
```

## 🧪 Angular Signals Example

The root app component demonstrates the Signals-first approach:

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-root',
  // ...
})
export class App {
  // Signal-based state
  protected clickCount = signal(0);

  // Computed signal
  protected doubleCount = computed(() => this.clickCount() * 2);

  // Update signal
  onIncrement(): void {
    this.clickCount.update((count) => count + 1);
  }
}
```

## 🔄 Nx Commands Reference

```bash
# Generate new Angular component
nx g @nx/angular:component my-component --project=client

# Generate new library
nx g @nx/angular:library my-lib --directory=libs/client/features

# View dependency graph
nx graph

# Run affected tests only
nx affected:test

# Build affected projects only
nx affected:build

# Clear Nx cache
nx reset
```

## 📖 Additional Resources

- [Nx Documentation](https://nx.dev)
- [Angular Documentation](https://angular.dev)
- [Kendo UI for Angular](https://www.telerik.com/kendo-angular-ui)
- [Angular Signals Guide](https://angular.dev/guide/signals)

## 🔐 Security Notes

- Backend runs in Azure Functions with VNet integration
- All API endpoints follow Zero Trust principles (ADR-002)
- Environment variables managed via `.env.local` (see `.env.local.example`)

## 🤝 Contributing

Please follow the project's contribution guidelines in `CONTRIBUTING.md` and ensure all commits follow Conventional Commits specification as per ADR-001.

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Architecture**: ADR-004 Compliant
