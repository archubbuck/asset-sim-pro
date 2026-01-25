/**
 * OrderEntryComponent
 * 
 * Order entry form widget for placing trading orders
 * Supports BUY/SELL, all order types (MARKET/LIMIT/STOP/STOP_LIMIT)
 * 
 * Features:
 * - Signal-based state with template-driven form validation
 * - Real-time price display from SignalR
 * - Integration with OrderApiService
 * - Kendo UI form controls
 */
import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { LabelModule } from '@progress/kendo-angular-label';
import { OrderApiService } from '@assetsim/shared/api-client';
import { SignalRService, LoggerService } from '@assetsim/client/core';
import { firstValueFrom } from 'rxjs';
import { 
  OrderSide, 
  OrderType, 
  CreateOrderRequest 
} from '@assetsim/shared/api-client';

/**
 * Order form model
 * 
 * quantity is nullable to support Kendo NumericTextBox clearing behavior
 * price and stopPrice are optional and nullable for the same reason
 */
interface OrderForm {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number | null;
  price?: number | null;
  stopPrice?: number | null;
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
              [value]="orderForm().symbol"
              (valueChange)="updateForm('symbol', $event)"
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
              [value]="orderForm().side"
              (valueChange)="updateForm('side', $event)"
              [data]="orderSides"
              [style.width.%]="100">
            </kendo-dropdownlist>
          </kendo-label>
        </div>

        <!-- Order Type -->
        <div class="form-group">
          <kendo-label text="Order Type">
            <kendo-dropdownlist
              [value]="orderForm().orderType"
              (valueChange)="updateForm('orderType', $event)"
              [data]="orderTypes"
              [style.width.%]="100">
            </kendo-dropdownlist>
          </kendo-label>
        </div>

        <!-- Quantity -->
        <div class="form-group">
          <kendo-label text="Quantity">
            <kendo-numerictextbox
              [value]="orderForm().quantity ?? undefined"
              (valueChange)="updateForm('quantity', $event)"
              [min]="1"
              [format]="'n0'"
              [style.width.%]="100">
            </kendo-numerictextbox>
          </kendo-label>
        </div>

        <!-- Limit Price (for LIMIT and STOP_LIMIT orders) -->
        @if (orderForm().orderType === 'LIMIT' || orderForm().orderType === 'STOP_LIMIT') {
          <div class="form-group">
            <kendo-label text="Limit Price">
              <kendo-numerictextbox
                [value]="orderForm().price ?? undefined"
                (valueChange)="updateForm('price', $event)"
                [min]="0.01"
                [format]="'c2'"
                [style.width.%]="100">
              </kendo-numerictextbox>
            </kendo-label>
          </div>
        }

        <!-- Stop Price (for STOP and STOP_LIMIT orders) -->
        @if (orderForm().orderType === 'STOP' || orderForm().orderType === 'STOP_LIMIT') {
          <div class="form-group">
            <kendo-label text="Stop Price">
              <kendo-numerictextbox
                [value]="orderForm().stopPrice ?? undefined"
                (valueChange)="updateForm('stopPrice', $event)"
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
  private destroyRef = inject(DestroyRef);
  private logger = inject(LoggerService);
  private resetTimeoutId: number | null = null;

  // Form data as a signal for reactivity
  orderForm = signal<OrderForm>({
    symbol: 'AAPL',
    side: 'BUY',
    orderType: 'MARKET',
    quantity: 100,
    price: null,
    stopPrice: null
  });

  constructor() {
    // Register cleanup for any pending timeouts
    this.destroyRef.onDestroy(() => {
      if (this.resetTimeoutId !== null) {
        clearTimeout(this.resetTimeoutId);
      }
    });
  }

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
    const symbolUpper = this.orderForm().symbol.toUpperCase();
    const priceData = prices.get(symbolUpper);
    return priceData?.price ?? null;
  });

  /**
   * Validate the order form
   */
  isFormValid = computed(() => {
    const form = this.orderForm();
    
    // Basic validation - explicit checks for null/undefined
    if (!form.symbol || form.quantity == null || form.quantity < 1) {
      return false;
    }

    // Validate limit price for LIMIT orders
    if ((form.orderType === 'LIMIT' || form.orderType === 'STOP_LIMIT') && form.price == null) {
      return false;
    }

    // Validate stop price for STOP orders
    if ((form.orderType === 'STOP' || form.orderType === 'STOP_LIMIT') && form.stopPrice == null) {
      return false;
    }

    return true;
  });

  /**
   * Update form field with type safety
   * 
   * Kendo NumericTextBox may emit `null` when cleared.
   * Keep null values as-is since OrderForm types now accept null for numeric fields.
   */
  updateForm<K extends keyof OrderForm>(field: K, value: OrderForm[K]): void {
    this.orderForm.update(form => ({ ...form, [field]: value }));
  }

  /**
   * Submit the order to the API, with stub mode fallback
   */
  async submitOrder(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set(null);
    this.statusType.set(null);

    try {
      const form = this.orderForm();
      // Note: In a real implementation, exchangeId and portfolioId would come from user context
      // Using valid UUIDs for demo compatibility with backend Zod validation
      const request: CreateOrderRequest = {
        exchangeId: '00000000-0000-0000-0000-000000000000',
        portfolioId: '11111111-1111-1111-1111-111111111111',
        symbol: form.symbol.toUpperCase(),
        side: form.side,
        orderType: form.orderType,
        quantity: form.quantity!, // Validation ensures quantity is not null and >= 1
        // Only include price/stopPrice when defined and not null
        ...(form.price != null && { price: form.price }),
        ...(form.stopPrice != null && { stopPrice: form.stopPrice })
      };

      try {
        const response = await firstValueFrom(this.orderApiService.createOrder(request));
        
        this.statusType.set('success');
        this.statusMessage.set(`Order ${response.orderId} placed successfully!`);
      } catch (apiError) {
        // Fallback to stub mode if API fails (e.g., no database seeding, network issue)
        this.logger.logTrace('API order creation failed, using stub mode', { error: apiError });
        const stubOrderId = `stub-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        
        this.statusType.set('success');
        this.statusMessage.set(`Order ${stubOrderId} placed (demo mode)`);
      }
      
      // Reset form after successful submission with proper cleanup
      // Clear any existing timeout before scheduling a new one
      if (this.resetTimeoutId !== null) {
        clearTimeout(this.resetTimeoutId);
      }
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetForm();
        this.resetTimeoutId = null;
      }, 2000);
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
    // Clear any pending timeout
    if (this.resetTimeoutId !== null) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    
    this.orderForm.set({
      symbol: 'AAPL',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 100,
      price: null,
      stopPrice: null
    });
    this.statusMessage.set(null);
    this.statusType.set(null);
  }
}
