import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ErrorNotificationComponent } from '@assetsim/client/core';

/**
 * Root Application Component - AssetSim Pro
 * 
 * Following ADR-004:
 * - Uses Angular Signals for reactive state management
 * - Designed for zoneless change detection
 * - Ready for Kendo UI for Angular components integration
 * 
 * Following ADR-018:
 * - Includes error notification component for RFC 7807 error display
 */
@Component({
  imports: [CommonModule, RouterModule, ErrorNotificationComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Root component delegates all UI to AppShell via router
}
