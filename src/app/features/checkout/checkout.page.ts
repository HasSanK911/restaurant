import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PAYMENT_METHODS } from '../../core/constants/app.constants';
import { DeliveryArea, FulfilmentType, PaymentMethod } from '../../core/models/order.model';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { normalisePhone, pakPhoneValidator, revealErrors } from '../../shared/validators/form.validators';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BreadcrumbsComponent } from '../../shared/components/ui/display.components';
import { FieldComponent } from '../../shared/components/ui/form.components';
import { SpinnerComponent } from '../../shared/components/ui/feedback.components';

/**
 * Checkout.
 *
 * Two fulfilment paths (home delivery, dine-in) and cash only, matching how the
 * restaurant actually operates. There is no payment step and no card field
 * anywhere in this flow; the copy says so repeatedly because customers ask.
 */
@Component({
  selector: 'app-checkout-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    ImageComponent,
    IconComponent,
    BreadcrumbsComponent,
    FieldComponent,
    SpinnerComponent,
    CurrencyPkrPipe,
  ],
  template: `
    <div class="pt-[calc(var(--header-h)+2.5rem)] pb-24">
      <div class="container-lux">
        <app-breadcrumbs
          [crumbs]="[{ label: 'Your Order', path: '/cart' }, { label: 'Checkout' }]"
          class="mb-7"
        />

        <h1 class="text-4xl leading-tight text-ink-900 sm:text-5xl">
          Checkout
          <span class="text-gradient-clay italic">, cash only</span>
        </h1>
        <p class="mt-3 max-w-2xl text-ink-600">
          We do not take card or online payment. Pay the rider in cash on delivery, or pay at the
          counter when you dine in.
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-10 grid gap-8 lg:grid-cols-12">
          <!-- Left: form -->
          <div class="space-y-6 lg:col-span-7">
            <!-- Fulfilment -->
            <fieldset class="panel p-6">
              <legend class="font-display text-xl text-ink-900">How would you like it?</legend>
              <div class="mt-5 grid gap-3 sm:grid-cols-2">
                @for (option of fulfilmentOptions; track option.value) {
                  <button
                    type="button"
                    class="flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-300"
                    [class]="
                      fulfilment() === option.value
                        ? 'border-clay-500/60 bg-clay-500/8'
                        : 'border-ink-200 hover:border-clay-500/35'
                    "
                    [attr.aria-pressed]="fulfilment() === option.value"
                    (click)="setFulfilment(option.value)"
                  >
                    <app-icon
                      [name]="$any(option.icon)"
                      [size]="20"
                      class="mt-0.5 shrink-0"
                      [class]="fulfilment() === option.value ? 'text-clay-600' : 'text-ink-500'"
                    />
                    <span>
                      <span class="block text-sm font-semibold text-ink-900">{{ option.label }}</span>
                      <span class="mt-0.5 block text-xs leading-relaxed text-ink-500">{{
                        option.description
                      }}</span>
                    </span>
                  </button>
                }
              </div>
            </fieldset>

            <!-- Contact -->
            <fieldset class="panel p-6">
              <legend class="font-display text-xl text-ink-900">Your details</legend>
              <div class="mt-5 grid gap-4 sm:grid-cols-2">
                <app-field label="Full name" [required]="true" [control]="form.controls.customerName" fieldId="name">
                  <input id="name" type="text" class="field" formControlName="customerName" autocomplete="name" />
                </app-field>
                <app-field
                  label="Mobile number"
                  [required]="true"
                  [control]="form.controls.customerPhone"
                  fieldId="phone"
                  hint="We call this number if the rider cannot find you."
                >
                  <input
                    id="phone"
                    type="tel"
                    class="field"
                    formControlName="customerPhone"
                    autocomplete="tel"
                    placeholder="0312-0991116"
                  />
                </app-field>
                <app-field
                  label="Email"
                  [control]="form.controls.customerEmail"
                  fieldId="email"
                  hint="Optional. For the order receipt."
                  class="sm:col-span-2"
                >
                  <input id="email" type="email" class="field" formControlName="customerEmail" autocomplete="email" />
                </app-field>
              </div>
            </fieldset>

            <!-- Delivery address -->
            @if (fulfilment() === 'delivery') {
              <fieldset class="panel p-6">
                <legend class="font-display text-xl text-ink-900">Delivery address</legend>

                <div class="mt-5 space-y-4">
                  <app-field
                    label="Delivery area"
                    [required]="true"
                    [control]="form.controls.deliveryAreaId"
                    fieldId="area"
                  >
                    <select id="area" class="field" formControlName="deliveryAreaId">
                      <option value="">Choose your area</option>
                      @for (area of areas(); track area.id) {
                        <option [value]="area.id">
                          {{ area.name }} &middot; {{ area.fee | pkr }} &middot;
                          {{ area.estimatedMinutes }} min
                        </option>
                      }
                    </select>
                  </app-field>

                  @if (selectedArea(); as area) {
                    <div class="rounded-xl border border-basil-400/25 bg-basil-500/8 p-4">
                      <p class="flex items-center gap-2 text-xs font-semibold text-basil-700">
                        <app-icon name="bike" [size]="14" />
                        {{ area.name }}: about {{ area.estimatedMinutes }} minutes
                      </p>
                      <p class="mt-1.5 text-xs text-ink-600">
                        Minimum order {{ area.minimumOrder | pkr }}.
                        @if (area.freeDeliveryAbove) {
                          Free delivery above {{ area.freeDeliveryAbove | pkr }}.
                        }
                      </p>
                      @if (!cart.meetsMinimum()) {
                        <p class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                          <app-icon name="alert" [size]="13" />
                          Add {{ area.minimumOrder - cart.subtotal() | pkr }} more to reach the
                          minimum for this area.
                        </p>
                      }
                    </div>
                  }

                  <div class="grid gap-4 sm:grid-cols-2">
                    <app-field
                      label="Address"
                      [required]="true"
                      [control]="form.controls.addressLine1"
                      fieldId="line1"
                      class="sm:col-span-2"
                    >
                      <input
                        id="line1"
                        type="text"
                        class="field"
                        formControlName="addressLine1"
                        placeholder="House number and street"
                        autocomplete="street-address"
                      />
                    </app-field>
                    <app-field label="Landmark" [control]="form.controls.landmark" fieldId="landmark" hint="Helps the rider find you faster.">
                      <input
                        id="landmark"
                        type="text"
                        class="field"
                        formControlName="landmark"
                        placeholder="Near the Jamia Masjid"
                      />
                    </app-field>
                    <app-field label="City" [control]="form.controls.city" fieldId="city">
                      <input id="city" type="text" class="field" formControlName="city" autocomplete="address-level2" />
                    </app-field>
                  </div>
                </div>
              </fieldset>
            } @else {
              <fieldset class="panel p-6">
                <legend class="font-display text-xl text-ink-900">Dine in with us</legend>
                <p class="mt-3 text-sm leading-relaxed text-ink-600">
                  We will have your order ready at the counter. If you would also like a table held,
                  book one and mention the order reference when you arrive.
                </p>
                <a routerLink="/reservation" class="btn btn-secondary btn-md mt-5">
                  <app-icon name="calendar" [size]="15" />
                  Book a table as well
                </a>
              </fieldset>
            }

            <!-- Payment -->
            <fieldset class="panel p-6">
              <legend class="font-display text-xl text-ink-900">Payment</legend>
              <div class="mt-5 space-y-3">
                @for (method of availablePayments(); track method.value) {
                  <label
                    class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all"
                    [class]="
                      paymentMethod() === method.value
                        ? 'border-clay-500/60 bg-clay-500/8'
                        : 'border-ink-200 hover:border-clay-500/35'
                    "
                  >
                    <input
                      type="radio"
                      class="mt-1 h-4 w-4 shrink-0 accent-[var(--color-clay-500)]"
                      name="payment"
                      [value]="method.value"
                      [checked]="paymentMethod() === method.value"
                      (change)="paymentMethod.set(method.value)"
                    />
                    <span>
                      <span class="block text-sm font-semibold text-ink-900">{{ method.label }}</span>
                      <span class="mt-0.5 block text-xs text-ink-500">{{ method.description }}</span>
                    </span>
                  </label>
                }
              </div>

              <div class="mt-5 flex items-start gap-3 rounded-xl border border-clay-500/20 bg-clay-500/5 p-4">
                <app-icon name="shield" [size]="18" class="mt-0.5 shrink-0 text-clay-600" />
                <p class="text-xs leading-relaxed text-ink-600">
                  <span class="font-semibold text-clay-700">No online payment.</span> We never ask
                  for card or bank details on this website. If anyone claiming to be Salateen asks
                  you to pay online, it is not us. Call
                  <a href="tel:+923120991116" class="text-clay-700 underline">0312-0991116</a>.
                </p>
              </div>
            </fieldset>

            <!-- Order note -->
            <fieldset class="panel p-6">
              <legend class="font-display text-xl text-ink-900">Anything else?</legend>
              <label class="sr-only" for="order-note">Note for the restaurant</label>
              <textarea
                id="order-note"
                rows="3"
                class="field mt-4 resize-none"
                placeholder="Ring the bell twice, call before you arrive, pack the raita separately..."
                maxlength="400"
                formControlName="note"
              ></textarea>
            </fieldset>
          </div>

          <!-- Right: summary -->
          <aside class="lg:col-span-5">
            <div class="panel sticky top-[calc(var(--header-h)+1.5rem)] p-6">
              <h2 class="font-display text-2xl text-ink-900">Your order</h2>

              <ul class="mt-5 max-h-72 space-y-3.5 overflow-y-auto pr-1">
                @for (line of cart.lines(); track line.key) {
                  <li class="flex gap-3">
                    <span class="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-ink-200">
                      <app-image [src]="line.image" [alt]="line.name" sizes="56px" class="h-full w-full" />
                      <span
                        class="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-clay-500 px-1 text-caption font-extrabold text-white"
                        >{{ line.quantity }}</span
                      >
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium text-ink-900">{{ line.name }}</span>
                      <span class="block text-xs text-ink-500">{{ line.variantLabel }}</span>
                    </span>
                    <span class="shrink-0 text-sm font-semibold text-clay-700 nums">{{
                      line.lineTotal | pkr
                    }}</span>
                  </li>
                }
              </ul>

              <dl class="mt-6 space-y-3 border-t border-ink-200 pt-5 text-sm">
                <div class="flex justify-between">
                  <dt class="text-ink-500">Subtotal</dt>
                  <dd class="font-medium text-ink-900 nums">{{ cart.subtotal() | pkr }}</dd>
                </div>
                @if (cart.discount() > 0) {
                  <div class="flex justify-between">
                    <dt class="text-emerald-700">
                      Discount
                      @if (cart.appliedCoupon(); as coupon) {
                        <span class="text-xs">({{ coupon.code }})</span>
                      }
                    </dt>
                    <dd class="font-medium text-emerald-700 nums">-{{ cart.discount() | pkr }}</dd>
                  </div>
                }
                @if (fulfilment() === 'delivery') {
                  <div class="flex justify-between">
                    <dt class="text-ink-500">Delivery</dt>
                    <dd class="font-medium nums" [class]="cart.deliveryFee() === 0 ? 'text-emerald-700' : 'text-ink-900'">
                      {{ cart.deliveryFee() === 0 ? 'Free' : (cart.deliveryFee() | pkr) }}
                    </dd>
                  </div>
                }
                <div class="flex items-baseline justify-between border-t border-ink-200 pt-4">
                  <dt class="font-semibold text-ink-900">Total to pay in cash</dt>
                  <dd class="font-display text-3xl text-clay-700 nums">{{ cart.grandTotal() | pkr }}</dd>
                </div>
              </dl>

              <button
                type="submit"
                class="btn btn-primary btn-lg mt-6 w-full"
                [disabled]="submitting() || !cart.meetsMinimum()"
              >
                @if (submitting()) {
                  <app-spinner [size]="17" />
                  Placing your order
                } @else {
                  Place order
                  <app-icon name="check" [size]="17" [strokeWidth]="2.4" />
                }
              </button>

              <p class="mt-3 text-center text-xs text-ink-500">
                By placing this order you agree to our
                <a routerLink="/terms" class="text-clay-600 hover:underline">terms</a>.
              </p>

              <div class="mt-5 space-y-2 border-t border-ink-200 pt-5">
                <p class="flex items-center gap-2 text-xs text-ink-500">
                  <app-icon name="clock" [size]="13" class="text-clay-600" />
                  Ready in about {{ estimatedMinutes() }} minutes
                </p>
                <p class="flex items-center gap-2 text-xs text-ink-500">
                  <app-icon name="phone" [size]="13" class="text-clay-600" />
                  Questions? Call 0312-0991116
                </p>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  `,
})
export class CheckoutPage {
  protected readonly cart = inject(CartService);
  private readonly orders = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);

  protected readonly fulfilmentOptions = [
    {
      value: 'delivery' as FulfilmentType,
      label: 'Home delivery',
      description: 'We bring it to your door. Cash on delivery.',
      icon: 'bike',
    },
    {
      value: 'dine-in' as FulfilmentType,
      label: 'Dine in / collect',
      description: 'Eat with us or collect from the counter. Cash at the counter.',
      icon: 'utensils',
    },
  ];

  protected readonly fulfilment = signal<FulfilmentType>('delivery');
  protected readonly paymentMethod = signal<PaymentMethod>('cash-on-delivery');
  protected readonly submitting = signal(false);

  protected readonly areas = toSignal(this.orders.deliveryAreas(), {
    initialValue: [] as DeliveryArea[],
  });

  protected readonly form = this.fb.nonNullable.group({
    customerName: ['', [Validators.required, Validators.minLength(3)]],
    customerPhone: ['', [Validators.required, pakPhoneValidator()]],
    customerEmail: ['', [Validators.email]],
    deliveryAreaId: [''],
    addressLine1: [''],
    landmark: [''],
    city: ['Swabi'],
    note: [''],
  });

  protected readonly selectedArea = computed(() => {
    const id = this.areaId();
    return this.areas().find((a) => a.id === id) ?? null;
  });

  private readonly areaId = toSignal(this.form.controls.deliveryAreaId.valueChanges, {
    initialValue: '',
  });

  protected readonly availablePayments = computed(() =>
    PAYMENT_METHODS.filter((m) => m.fulfilment === this.fulfilment()),
  );

  protected readonly estimatedMinutes = computed(() => {
    const base = 25 + Math.min(20, this.cart.lines().length * 4);
    return this.fulfilment() === 'delivery'
      ? base + (this.selectedArea()?.estimatedMinutes ?? 20)
      : base;
  });

  constructor() {
    this.seo.apply({
      title: 'Checkout | Salateen Restaurant Swabi',
      description: 'Complete your Salateen Restaurant order. Cash on delivery or cash at counter.',
      path: 'checkout',
      noIndex: true,
    });

    // Prefill from the signed-in profile.
    effect(() => {
      const user = this.auth.user();
      if (!user) return;
      this.form.patchValue(
        {
          customerName: user.name,
          customerPhone: user.phone,
          customerEmail: user.email,
        },
        { emitEvent: false },
      );
    });

    // Delivery-only validators, toggled with the fulfilment mode.
    effect(() => {
      const isDelivery = this.fulfilment() === 'delivery';
      const { deliveryAreaId, addressLine1 } = this.form.controls;
      if (isDelivery) {
        deliveryAreaId.addValidators(Validators.required);
        addressLine1.addValidators([Validators.required, Validators.minLength(6)]);
      } else {
        deliveryAreaId.clearValidators();
        addressLine1.clearValidators();
      }
      deliveryAreaId.updateValueAndValidity({ emitEvent: false });
      addressLine1.updateValueAndValidity({ emitEvent: false });
      this.cart.setFulfilment(this.fulfilment());
      this.paymentMethod.set(isDelivery ? 'cash-on-delivery' : 'cash-at-counter');
    });

    // Keep the cart's fee calculation in step with the chosen area.
    effect(() => this.cart.setDeliveryArea(this.selectedArea()));
  }

  protected setFulfilment(type: FulfilmentType): void {
    this.fulfilment.set(type);
  }

  protected submit(): void {
    if (this.form.invalid) {
      revealErrors(this.form);
      this.toast.error('Check the form', 'Some required details are missing or invalid.');
      return;
    }
    if (this.cart.isEmpty()) {
      void this.router.navigate(['/menu']);
      return;
    }
    if (!this.cart.meetsMinimum()) {
      this.toast.error('Below the minimum', 'This delivery area has a minimum order value.');
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();
    const isDelivery = this.fulfilment() === 'delivery';

    this.orders
      .place({
        customerId: this.auth.user()?.id ?? null,
        customerName: value.customerName.trim(),
        customerPhone: normalisePhone(value.customerPhone),
        customerEmail: value.customerEmail.trim() || undefined,
        fulfilment: this.fulfilment(),
        paymentMethod: this.paymentMethod(),
        items: this.cart.toOrderItems(),
        subtotal: this.cart.subtotal(),
        discount: this.cart.discount(),
        couponCode: this.cart.appliedCoupon()?.code,
        deliveryFee: this.cart.deliveryFee(),
        tax: this.cart.tax(),
        grandTotal: this.cart.grandTotal(),
        deliveryAddress: isDelivery
          ? {
              line1: value.addressLine1.trim(),
              area: this.selectedArea()?.name,
              city: value.city.trim() || 'Swabi',
              landmark: value.landmark.trim() || undefined,
              phone: normalisePhone(value.customerPhone),
            }
          : undefined,
        deliveryAreaId: isDelivery ? value.deliveryAreaId : undefined,
        note: value.note.trim() || undefined,
      })
      .subscribe({
        next: (order) => {
          this.cart.clear();
          this.submitting.set(false);
          this.toast.success('Order placed', `Reference ${order.reference}. We will call to confirm.`);
          void this.router.navigate(['/order/confirmation', order.id]);
        },
        error: () => {
          this.submitting.set(false);
          this.toast.error(
            'We could not place that order',
            'Please try again, or call us on 0312-0991116.',
          );
        },
      });
  }
}
