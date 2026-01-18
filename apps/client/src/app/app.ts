import { Component, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

/**
 * Root Application Component - AssetSim Pro
 * 
 * Following ADR-004:
 * - Uses Angular Signals for reactive state management
 * - Designed for zoneless change detection
 * - Ready for Kendo UI for Angular components integration
 */
@Component({
  imports: [CommonModule, RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Signal-based state management
  protected title = signal('AssetSim Pro');
  protected subtitle = signal('Institutional Trading Portal');
  
  // Computed signal demonstrating reactive composition
  protected fullTitle = computed(() => 
    `${this.title()} - ${this.subtitle()}`
  );
  
  // Signal for tracking user interaction
  protected clickCount = signal(0);
  
  // Method using signals (zoneless-ready)
  onTestClick(): void {
    this.clickCount.update(count => count + 1);
  }
}
