/**
 * PositionBlotterComponent
 * 
 * Displays order history and positions using Kendo Grid
 * Shows FILLED, OPEN (PENDING/PARTIAL), and CANCELLED orders
 * 
 * Features:
 * - Kendo Grid for tabular data display
 * - Real-time order updates
 * - Filtering by status
 * - Order cancellation capability
 */
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GridModule, GridDataResult, PageChangeEvent } from '@progress/kendo-angular-grid';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { OrderApiService } from '@assetsim/shared/api-client';
import { OrderResponse, OrderStatus } from '@assetsim/shared/api-client';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-position-blotter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GridModule,
    ButtonsModule,
    DropDownsModule
  ],
  template: `
    <div class="widget position-blotter">
      <div class="widget-header">
        <h3 class="widget-title">Position Blotter</h3>
        <div class="widget-controls">
          <kendo-dropdownlist
            [(ngModel)]="filterStatus"
            [data]="statusOptions"
            textField="text"
            valueField="value"
            [valuePrimitive]="true"
            (valueChange)="onFilterChange()"
            [style.width.px]="150">
          </kendo-dropdownlist>
          <button
            kendoButton
            themeColor="primary"
            [icon]="'refresh'"
            (click)="refreshOrders()">
            Refresh
          </button>
        </div>
      </div>
      
      @if (isLoading()) {
        <div class="loading-state">Loading orders...</div>
      } @else if (errorMessage()) {
        <div class="error-state">{{ errorMessage() }}</div>
      } @else {
        <kendo-grid
          [data]="gridView"
          [pageSize]="pageSize"
          [skip]="skip"
          [pageable]="true"
          [sortable]="true"
          [resizable]="true"
          (pageChange)="pageChange($event)"
          [height]="400">
          
          <kendo-grid-column field="orderId" title="Order ID" [width]="200">
            <ng-template kendoGridCellTemplate let-dataItem>
              <span class="monospace">{{ (dataItem.orderId ?? '').slice(0, 8) }}...</span>
            </ng-template>
          </kendo-grid-column>
          
          <kendo-grid-column field="symbol" title="Symbol" [width]="100"></kendo-grid-column>
          
          <kendo-grid-column field="side" title="Side" [width]="80">
            <ng-template kendoGridCellTemplate let-dataItem>
              <span 
                class="side-badge"
                [class.buy]="dataItem.side === 'BUY'"
                [class.sell]="dataItem.side === 'SELL'">
                {{ dataItem.side }}
              </span>
            </ng-template>
          </kendo-grid-column>
          
          <kendo-grid-column field="orderType" title="Type" [width]="100"></kendo-grid-column>
          
          <kendo-grid-column field="quantity" title="Quantity" [width]="100">
            <ng-template kendoGridCellTemplate let-dataItem>
              {{ dataItem.quantity | number }}
            </ng-template>
          </kendo-grid-column>
          
          <kendo-grid-column field="filledQuantity" title="Filled" [width]="100">
            <ng-template kendoGridCellTemplate let-dataItem>
              {{ dataItem.filledQuantity | number }}
            </ng-template>
          </kendo-grid-column>
          
          <kendo-grid-column field="price" title="Price" [width]="100">
            <ng-template kendoGridCellTemplate let-dataItem>
              @if (dataItem.price != null) {
                {{ dataItem.price | currency }}
              } @else {
                <span class="text-muted">Market</span>
              }
            </ng-template>
          </kendo-grid-column>
          
          <kendo-grid-column field="averagePrice" title="Avg Price" [width]="100">
            <ng-template kendoGridCellTemplate let-dataItem>
              @if (dataItem.averagePrice != null) {
                {{ dataItem.averagePrice | currency }}
              } @else {
                <span class="text-muted">-</span>
              }
            </ng-template>
          </kendo-grid-column>
          
          <kendo-grid-column field="status" title="Status" [width]="100">
            <ng-template kendoGridCellTemplate let-dataItem>
              <span 
                class="status-badge"
                [class.filled]="dataItem.status === 'FILLED'"
                [class.pending]="dataItem.status === 'PENDING'"
                [class.partial]="dataItem.status === 'PARTIAL'"
                [class.cancelled]="dataItem.status === 'CANCELLED'"
                [class.rejected]="dataItem.status === 'REJECTED'">
                {{ dataItem.status }}
              </span>
            </ng-template>
          </kendo-grid-column>
          
          <kendo-grid-column field="createdAt" title="Created" [width]="150">
            <ng-template kendoGridCellTemplate let-dataItem>
              {{ dataItem.createdAt | date:'short' }}
            </ng-template>
          </kendo-grid-column>
          
          <kendo-grid-column title="Actions" [width]="120">
            <ng-template kendoGridCellTemplate let-dataItem>
              @if (dataItem.status === 'PENDING' || dataItem.status === 'PARTIAL') {
                <button
                  kendoButton
                  size="small"
                  themeColor="error"
                  (click)="cancelOrder(dataItem)">
                  Cancel
                </button>
              }
            </ng-template>
          </kendo-grid-column>
        </kendo-grid>
      }
    </div>
  `,
  styles: [`
    .widget {
      padding: 1rem;
      background-color: #334155;
      border-radius: 0.25rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    
    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .widget-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #cbd5e1;
      margin: 0;
    }
    
    .widget-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    
    .loading-state,
    .error-state {
      padding: 2rem;
      text-align: center;
      color: #d1d5db;
    }
    
    .error-state {
      color: #f87171;
    }
    
    .monospace {
      font-family: monospace;
      font-size: 0.875rem;
    }
    
    .side-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .side-badge.buy {
      background-color: #065f46;
      color: #d1fae5;
    }
    
    .side-badge.sell {
      background-color: #991b1b;
      color: #fee2e2;
    }
    
    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-badge.filled {
      background-color: #065f46;
      color: #d1fae5;
    }
    
    .status-badge.pending,
    .status-badge.partial {
      background-color: #854d0e;
      color: #fef3c7;
    }
    
    .status-badge.cancelled,
    .status-badge.rejected {
      background-color: #991b1b;
      color: #fee2e2;
    }
    
    .text-muted {
      color: #9ca3af;
    }

    /* Kendo Grid styling overrides */
    :host .k-grid {
      background-color: #1e293b;
      color: #cbd5e1;
    }

    :host .k-grid-header {
      background-color: #0f172a;
    }

    :host .k-grid-header .k-header {
      background-color: #0f172a;
      color: #cbd5e1;
      border-color: #475569;
    }

    :host .k-grid td {
      border-color: #475569;
    }

    :host .k-grid tr:hover {
      background-color: #334155;
    }

    :host .k-pager-wrap {
      background-color: #1e293b;
      color: #cbd5e1;
      border-color: #475569;
    }
  `]
})
export class PositionBlotterComponent implements OnInit {
  private orderApiService = inject(OrderApiService);

  // Grid data
  orders = signal<OrderResponse[]>([]);
  gridView: GridDataResult = { data: [], total: 0 };
  
  // Pagination
  pageSize = 10;
  skip = 0;

  // Filter
  filterStatus = 'all';
  statusOptions = [
    { text: 'All Orders', value: 'all' },
    { text: 'Open (Pending/Partial)', value: 'open' },
    { text: 'Filled', value: 'FILLED' },
    { text: 'Cancelled', value: 'CANCELLED' },
    { text: 'Rejected', value: 'REJECTED' }
  ];

  // State
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  isStubMode = signal(false); // Track if we're using stub data

  async ngOnInit(): Promise<void> {
    await this.loadOrders();
  }

  /**
   * Load orders from API
   */
  async loadOrders(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      // In a real implementation, exchangeId would come from user context
      // Using valid UUID for demo compatibility with backend Zod validation
      const query = {
        exchangeId: '00000000-0000-0000-0000-000000000000',
        limit: 100,
        offset: 0
      };

      const orders = await firstValueFrom(this.orderApiService.listOrders(query));
      this.orders.set(orders || []);
      this.isStubMode.set(false); // Real data loaded
      this.updateGridView();
    } catch (error) {
      this.errorMessage.set(`Failed to load orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Fallback to stub data for demonstration
      this.loadStubData();
      this.isStubMode.set(true); // Using stub data
      // Clear the blocking error so the grid can render stub data
      this.errorMessage.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Load stub data for demonstration
   */
  loadStubData(): void {
    const stubOrders: OrderResponse[] = [
      {
        orderId: '10000000-0000-0000-0000-000000000001',
        exchangeId: '00000000-0000-0000-0000-000000000000',
        portfolioId: '11111111-1111-1111-1111-111111111111',
        symbol: 'AAPL',
        side: 'BUY',
        orderType: 'MARKET',
        quantity: 100,
        filledQuantity: 100,
        averagePrice: 178.50,
        status: 'FILLED',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        orderId: '10000000-0000-0000-0000-000000000002',
        exchangeId: '00000000-0000-0000-0000-000000000000',
        portfolioId: '11111111-1111-1111-1111-111111111111',
        symbol: 'MSFT',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 50,
        price: 380.00,
        filledQuantity: 25,
        averagePrice: 379.75,
        status: 'PARTIAL',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString()
      },
      {
        orderId: '10000000-0000-0000-0000-000000000003',
        exchangeId: '00000000-0000-0000-0000-000000000000',
        portfolioId: '11111111-1111-1111-1111-111111111111',
        symbol: 'GOOGL',
        side: 'SELL',
        orderType: 'LIMIT',
        quantity: 75,
        price: 142.00,
        filledQuantity: 0,
        status: 'PENDING',
        createdAt: new Date(Date.now() - 900000).toISOString(),
        updatedAt: new Date(Date.now() - 900000).toISOString()
      },
      {
        orderId: '10000000-0000-0000-0000-000000000004',
        exchangeId: '00000000-0000-0000-0000-000000000000',
        portfolioId: '11111111-1111-1111-1111-111111111111',
        symbol: 'TSLA',
        side: 'BUY',
        orderType: 'MARKET',
        quantity: 200,
        filledQuantity: 0,
        status: 'CANCELLED',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    this.orders.set(stubOrders);
    this.updateGridView();
  }

  /**
   * Update grid view with filtered data
   */
  updateGridView(): void {
    let filteredOrders = this.orders();

    // Apply status filter
    if (this.filterStatus !== 'all') {
      if (this.filterStatus === 'open') {
        filteredOrders = filteredOrders.filter(
          o => o.status === 'PENDING' || o.status === 'PARTIAL'
        );
      } else {
        filteredOrders = filteredOrders.filter(
          o => o.status === this.filterStatus as OrderStatus
        );
      }
    }

    this.gridView = {
      data: filteredOrders.slice(this.skip, this.skip + this.pageSize),
      total: filteredOrders.length
    };
  }

  /**
   * Handle page change
   */
  pageChange(event: PageChangeEvent): void {
    this.skip = event.skip;
    this.updateGridView();
  }

  /**
   * Handle filter change
   */
  onFilterChange(): void {
    this.skip = 0;
    this.updateGridView();
  }

  /**
   * Refresh orders
   */
  refreshOrders(): void {
    void this.loadOrders();
  }

  /**
   * Cancel an order
   */
  async cancelOrder(order: OrderResponse): Promise<void> {
    // If in stub mode, handle cancellation locally
    if (this.isStubMode()) {
      // Update the order status locally in stub mode
      const currentOrders = this.orders();
      const updatedOrders = currentOrders.map(o => 
        o.orderId === order.orderId 
          ? { ...o, status: 'CANCELLED' as OrderStatus, updatedAt: new Date().toISOString() }
          : o
      );
      this.orders.set(updatedOrders);
      this.updateGridView();
      return;
    }

    // Real API call for non-stub mode
    try {
      await firstValueFrom(this.orderApiService.cancelOrder(order.orderId, order.exchangeId));
      
      // Refresh orders after cancellation
      this.refreshOrders();
    } catch (error) {
      this.errorMessage.set(`Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
