/**
 * OrderEntryComponent
 * 
 * Order entry form widget for placing trading orders
 * Supports BUY/SELL, all order types (MARKET/LIMIT/STOP/STOP_LIMIT)
 * 
 * Features:
 * - Reactive form with validation
 * - Real-time price display from SignalR
 * - Integration with OrderApiService
 * - Kendo UI form controls
 */
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { LabelModule } from '@progress/kendo-angular-label';
import { OrderApiService } from '@assetsim/shared/api-client';
import { SignalRService } from '@assetsim/client/core';
import { 
  OrderSide, 
  OrderType, 
  CreateOrderRequest 
} from '@assetsim/shared/api-client';

/**
 * Order form model
 */
interface OrderForm {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
}

@Component({
  selector: 'app-order-entry',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonsModule,
    DropDownsModule,
    InputsModule,
    LabelModule
  ],
  template: `
    <div class="widget order-entry">
      <h3 class="widget-title">Order Entry</h3>
      
      <div class="order-form">
        <!-- Symbol Input -->
        <div class="form-group">
          <kendo-label text="Symbol">
            <kendo-textbox
              [(ngModel)]="orderForm.symbol"
              placeholder="e.g., AAPL"
              [style.width.%]="100">
            </kendo-textbox>
          </kendo-label>
          @if (currentPrice() !== null) {
            <div class="current-price">
              Current: {{ currentPrice() | currency }}
            </div>
          }
        </div>

        <!-- Side Selection (BUY/SELL) -->
        <div class="form-group">
          <kendo-label text="Side">
            <kendo-dropdownlist
              [(ngModel)]="orderForm.side"
              [data]="orderSides"
              [style.width.%]="100">
            </kendo-dropdownlist>
          </kendo-label>
        </div>

        <!-- Order Type -->
        <div class="form-group">
          <kendo-label text="Order Type">
            <kendo-dropdownlist
              [(ngModel)]="orderForm.orderType"
              [data]="orderTypes"
              [style.width.%]="100">
            </kendo-dropdownlist>
          </kendo-label>
        </div>

        <!-- Quantity -->
        <div class="form-group">
          <kendo-label text="Quantity">
            <kendo-numerictextbox
              [(ngModel)]="orderForm.quantity"
              [min]="1"
              [format]="'n0'"
              [style.width.%]="100">
            </kendo-numerictextbox>
          </kendo-label>
        </div>

        <!-- Limit Price (for LIMIT and STOP_LIMIT orders) -->
        @if (orderForm.orderType === 'LIMIT' || orderForm.orderType === 'STOP_LIMIT') {
          <div class="form-group">
            <kendo-label text="Limit Price">
              <kendo-numerictextbox
                [(ngModel)]="orderForm.price"
                [min]="0.01"
                [format]="'c2'"
                [style.width.%]="100">
              </kendo-numerictextbox>
            </kendo-label>
          </div>
        }

        <!-- Stop Price (for STOP and STOP_LIMIT orders) -->
        @if (orderForm.orderType === 'STOP' || orderForm.orderType === 'STOP_LIMIT') {
          <div class="form-group">
            <kendo-label text="Stop Price">
              <kendo-numerictextbox
                [(ngModel)]="orderForm.stopPrice"
                [min]="0.01"
                [format]="'c2'"
                [style.width.%]="100">
              </kendo-numerictextbox>
            </kendo-label>
          </div>
        }

        <!-- Action Buttons -->
        <div class="form-actions">
          <button
            kendoButton
            themeColor="primary"
            [disabled]="!isFormValid() || isSubmitting()"
            (click)="submitOrder()">
            @if (isSubmitting()) {
              Submitting...
            } @else {
              Place Order
            }
          </button>
          <button
            kendoButton
            [disabled]="isSubmitting()"
            (click)="resetForm()">
            Reset
          </button>
        </div>

        <!-- Status Message -->
        @if (statusMessage()) {
          <div 
            class="status-message" 
            [class.success]="statusType() === 'success'"
            [class.error]="statusType() === 'error'">
            {{ statusMessage() }}
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .widget {
      padding: 1rem;
      background-color: #334155;
      border-radius: 0.25rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    
    .widget-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #cbd5e1;
    }
    
    .order-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .current-price {
      font-size: 0.875rem;
      color: #10b981;
      margin-top: 0.25rem;
      font-family: monospace;
    }
    
    .form-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    
    .form-actions button {
      flex: 1;
    }
    
    .status-message {
      padding: 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    
    .status-message.success {
      background-color: #065f46;
      color: #d1fae5;
    }
    
    .status-message.error {
      background-color: #991b1b;
      color: #fee2e2;
    }
  `]
})
export class OrderEntryComponent {
  private orderApiService = inject(OrderApiService);
  private signalRService = inject(SignalRService);

  // Form data
  orderForm: OrderForm = {
    symbol: 'AAPL',
    side: 'BUY',
    orderType: 'MARKET',
    quantity: 100,
    price: undefined,
    stopPrice: undefined
  };

  // Dropdown options
  orderSides: OrderSide[] = ['BUY', 'SELL'];
  orderTypes: OrderType[] = ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'];

  // State signals
  isSubmitting = signal(false);
  statusMessage = signal<string | null>(null);
  statusType = signal<'success' | 'error' | null>(null);

  // Computed current price for the selected symbol
  currentPrice = computed(() => {
    const prices = this.signalRService.latestPrices();
    const symbolUpper = this.orderForm.symbol.toUpperCase();
    const priceData = prices.get(symbolUpper);
    return priceData?.price ?? null;
  });

  /**
   * Validate the order form
   */
  isFormValid = computed(() => {
    const form = this.orderForm;
    
    // Basic validation
    if (!form.symbol || form.quantity < 1) {
      return false;
    }

    // Validate limit price for LIMIT orders
    if ((form.orderType === 'LIMIT' || form.orderType === 'STOP_LIMIT') && !form.price) {
      return false;
    }

    // Validate stop price for STOP orders
    if ((form.orderType === 'STOP' || form.orderType === 'STOP_LIMIT') && !form.stopPrice) {
      return false;
    }

    return true;
  });

  /**
   * Submit the order to the API
   */
  async submitOrder(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set(null);
    this.statusType.set(null);

    try {
      // Note: In a real implementation, exchangeId and portfolioId would come from user context
      // For stub purposes, we use hardcoded values
      const request: CreateOrderRequest = {
        exchangeId: 'demo-exchange-001',
        portfolioId: 'demo-portfolio-001',
        symbol: this.orderForm.symbol.toUpperCase(),
        side: this.orderForm.side,
        orderType: this.orderForm.orderType,
        quantity: this.orderForm.quantity,
        price: this.orderForm.price,
        stopPrice: this.orderForm.stopPrice
      };

      const response = await this.orderApiService.createOrder(request).toPromise();
      
      this.statusType.set('success');
      this.statusMessage.set(`Order ${response?.orderId} placed successfully!`);
      
      // Reset form after successful submission
      setTimeout(() => this.resetForm(), 2000);
    } catch (error) {
      this.statusType.set('error');
      this.statusMessage.set(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Reset the form to default values
   */
  resetForm(): void {
    this.orderForm = {
      symbol: 'AAPL',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 100,
      price: undefined,
      stopPrice: undefined
    };
    this.statusMessage.set(null);
    this.statusType.set(null);
  }
}
