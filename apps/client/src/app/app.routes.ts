import { Route } from '@angular/router';
import { AppShellComponent } from '@assetsim/client/core';
import { DashboardComponent } from '@assetsim/client/dashboard';

export const appRoutes: Route[] = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'portfolio',
        loadComponent: () => import('@assetsim/client/features/trading').then(m => m.Trading)
      },
      {
        path: 'trade',
        loadComponent: () => import('@assetsim/client/features/trading').then(m => m.Trading)
      }
    ]
  }
];
