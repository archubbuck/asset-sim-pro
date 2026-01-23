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
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { IndicatorsModule } from '@progress/kendo-angular-indicators';
import { menuIcon } from '@progress/kendo-svg-icons';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutModule, ButtonsModule, IndicatorsModule],
  template: `
    <kendo-appbar position="top" class="bg-slate-900 text-white border-b border-slate-700">
      <kendo-appbar-section>
        <button kendoButton fillMode="flat" [svgIcon]="icons.menu" (click)="drawer.toggle()"></button>
        <span class="text-xl font-bold ml-4 text-blue-400">AssetSim Pro</span>
      </kendo-appbar-section>
      <kendo-appbar-spacer></kendo-appbar-spacer>
      <kendo-appbar-section>
        <span class="mx-3 text-xs uppercase text-gray-400">Buying Power</span>
        <span class="mx-3 text-sm font-mono text-green-400">{{ buyingPower() | currency:'USD':'symbol':'1.0-0' }}</span>
        <kendo-avatar [initials]="userInitials()" shape="circle" themeColor="primary"></kendo-avatar>
      </kendo-appbar-section>
    </kendo-appbar>

    <kendo-drawer-container>
      <kendo-drawer #drawer mode="push" [items]="navItems" [expanded]="true" [mini]="true" (select)="onSelect($event)">
      </kendo-drawer>
      <kendo-drawer-content>
        <div class="p-6 bg-slate-800 h-full text-white"><router-outlet></router-outlet></div>
      </kendo-drawer-content>
    </kendo-drawer-container>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    kendo-drawer-container {
      height: calc(100vh - 56px); /* Subtract AppBar height */
    }

    kendo-appbar {
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
  `]
})
export class AppShellComponent {
  public auth = inject(AuthService);
  private router = inject(Router);
  private logger = inject(LoggerService);
  public icons = { menu: menuIcon };
    
  public buyingPower = signal(10000000);
  public userInitials = computed(() => this.auth.user()?.userDetails.substring(0, 2).toUpperCase() || 'US');

  public navItems: DrawerItem[] = [
    { text: 'Terminal', icon: 'k-i-grid', path: '/dashboard', selected: true },
    { text: 'Fund Performance', icon: 'k-i-dollar', path: '/portfolio' },
    { text: 'Execution', icon: 'k-i-chart-line-markers', path: '/trade' }
  ];

  public onSelect(ev: DrawerSelectEvent): void {
    if (ev.item.path) {
      this.logger.logEvent('Navigation', { target: ev.item.path });
      this.router.navigate([ev.item.path]);
    }
  }
}
