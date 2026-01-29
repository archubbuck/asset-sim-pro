/**
 * AppShellComponent
 * 
 * Implements ADR-022: Trading UI Components
 * Main layout component with Kendo AppBar, Drawer navigation, and responsive buying power display
 * 
 * Features:
 * - Kendo AppBar with menu toggle and branding
 * - Kendo Drawer for navigation with mini mode support
 * - Buying power display with currency formatting
 * - User avatar with initials from AuthService
 * - Responsive layout with institutional dark theme
 */
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../auth/auth.factory';
import { LoggerService } from '../logger/logger.service';
import { LayoutModule, DrawerItem, DrawerSelectEvent } from '@progress/kendo-angular-layout';
import { NavigationModule } from '@progress/kendo-angular-navigation';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { IndicatorsModule } from '@progress/kendo-angular-indicators';
import { menuIcon } from '@progress/kendo-svg-icons';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutModule, NavigationModule, ButtonsModule, IndicatorsModule],
  template: `
    <kendo-appbar position="top" class="app-bar">
      <kendo-appbar-section>
        <button kendoButton fillMode="flat" [svgIcon]="icons.menu" (click)="drawer.toggle()"></button>
        <span class="app-title">AssetSim Pro</span>
      </kendo-appbar-section>
      <kendo-appbar-spacer></kendo-appbar-spacer>
      <kendo-appbar-section>
        <span class="buying-power-label">Buying Power</span>
        <span class="buying-power-value">{{ buyingPower() | currency:'USD':'symbol':'1.0-0' }}</span>
        <kendo-avatar [initials]="userInitials()" shape="circle" themeColor="primary"></kendo-avatar>
      </kendo-appbar-section>
    </kendo-appbar>

    <kendo-drawer-container>
      <kendo-drawer #drawer mode="push" [items]="navItems" [expanded]="true" [mini]="true" (select)="onSelect($event)">
      </kendo-drawer>
      <kendo-drawer-content>
        <div class="drawer-content"><router-outlet></router-outlet></div>
      </kendo-drawer-content>
    </kendo-drawer-container>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .app-bar {
      background-color: #0f172a;
      color: white;
      border-bottom: 1px solid #334155;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }

    .app-title {
      font-size: 1.25rem;
      font-weight: bold;
      margin-left: 1rem;
      color: #3b82f6;
    }

    .buying-power-label {
      margin: 0 0.75rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: #9ca3af;
    }

    .buying-power-value {
      margin: 0 0.75rem;
      font-size: 0.875rem;
      font-family: monospace;
      color: #4ade80;
    }

    kendo-drawer-container {
      height: calc(100vh - 56px);
    }

    .drawer-content {
      padding: 1.5rem;
      background-color: #1e293b;
      height: 100%;
      color: white;
    }
  `]
})
export class AppShellComponent {
  public auth = inject(AuthService);
  private router = inject(Router);
  private logger = inject(LoggerService);
  public icons = { menu: menuIcon };
    
  public buyingPower = signal(10000000);
  public userInitials = computed(() => {
    const userDetails = this.auth.user()?.userDetails;
    return userDetails && userDetails.length >= 2 ? userDetails.substring(0, 2).toUpperCase() : 'US';
  });

  public navItems: DrawerItem[] = [
    { text: 'Terminal', icon: 'k-i-grid', id: '/dashboard', selected: true },
    { text: 'Fund Performance', icon: 'k-i-dollar', id: '/portfolio' },
    { text: 'Execution', icon: 'k-i-chart-line-markers', id: '/trade' }
  ];

  public onSelect(ev: DrawerSelectEvent): void {
    if (ev.item.id) {
      this.logger.logEvent('Navigation', { target: ev.item.id });
      this.router.navigate([ev.item.id]);
    }
  }
}
