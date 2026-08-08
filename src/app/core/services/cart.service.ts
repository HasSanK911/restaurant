import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/api.constants';
import { ID, Money } from '../models/common.model';
import { MenuAddon, MenuItem, MenuVariant } from '../models/menu.model';
import {
  CartAddon,
  CartLine,
  CartTotals,
  Coupon,
  CouponValidation,
  DeliveryArea,
  FulfilmentType,
  OrderItem,
} from '../models/order.model';
import { StorageService } from './storage.service';

export interface AddToCartInput {
  item: MenuItem;
  variant: MenuVariant;
  quantity: number;
  addons?: { addon: MenuAddon; quantity: number }[];
  note?: string;
}

/**
 * The cart is the one piece of client state that must survive a refresh, so it
 * is mirrored into localStorage on every mutation. All derived numbers are
 * computed signals: nothing is stored that can be recalculated.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly storage = inject(StorageService);

  readonly lines = signal<CartLine[]>(
    this.storage.get<CartLine[]>(STORAGE_KEYS.cart, []),
  );
  readonly fulfilment = signal<FulfilmentType>('delivery');
  readonly deliveryArea = signal<DeliveryArea | null>(null);
  readonly appliedCoupon = signal<Coupon | null>(null);
  readonly couponFreeDelivery = signal(false);

  /** Drawer visibility lives here so any component can open it. */
  readonly isOpen = signal(false);

  readonly itemCount = computed(() => this.lines().reduce((n, l) => n + l.quantity, 0));
  readonly isEmpty = computed(() => this.lines().length === 0);
  readonly subtotal = computed<Money>(() => this.lines().reduce((s, l) => s + l.lineTotal, 0));

  readonly discount = computed<Money>(() => {
    const coupon = this.appliedCoupon();
    if (!coupon) return 0;
    return computeDiscount(coupon, this.subtotal());
  });

  readonly deliveryFee = computed<Money>(() => {
    if (this.fulfilment() !== 'delivery') return 0;
    const area = this.deliveryArea();
    if (!area) return 0;
    if (this.couponFreeDelivery()) return 0;
    if (area.freeDeliveryAbove !== null && this.subtotal() >= area.freeDeliveryAbove) return 0;
    return area.fee;
  });

  /** Kept at zero: the restaurant prices tax-inclusive. Wired for Laravel. */
  readonly tax = computed<Money>(() => 0);

  readonly grandTotal = computed<Money>(
    () => Math.max(0, this.subtotal() - this.discount()) + this.deliveryFee() + this.tax(),
  );

  readonly totals = computed<CartTotals>(() => ({
    itemCount: this.itemCount(),
    subtotal: this.subtotal(),
    discount: this.discount(),
    deliveryFee: this.deliveryFee(),
    tax: this.tax(),
    grandTotal: this.grandTotal(),
  }));

  /** How far the basket is from free delivery, for the progress nudge. */
  readonly freeDeliveryGap = computed(() => {
    const area = this.deliveryArea();
    if (this.fulfilment() !== 'delivery' || !area?.freeDeliveryAbove) return null;
    const gap = area.freeDeliveryAbove - this.subtotal();
    return gap > 0 ? gap : 0;
  });

  readonly meetsMinimum = computed(() => {
    const area = this.deliveryArea();
    if (this.fulfilment() !== 'delivery' || !area) return true;
    return this.subtotal() >= area.minimumOrder;
  });

  readonly longestPrepMinutes = computed(() => 0);

  constructor() {
    effect(() => this.storage.set(STORAGE_KEYS.cart, this.lines()));
  }

  add(input: AddToCartInput): void {
    const line = buildLine(input);
    this.lines.update((lines) => {
      const existing = lines.findIndex((l) => l.key === line.key);
      if (existing === -1) return [...lines, line];
      const merged = [...lines];
      const next = { ...merged[existing] };
      next.quantity += line.quantity;
      next.lineTotal = lineTotalFor(next);
      merged[existing] = next;
      return merged;
    });
  }

  setQuantity(key: string, quantity: number): void {
    if (quantity <= 0) return this.remove(key);
    this.lines.update((lines) =>
      lines.map((l) => (l.key === key ? { ...l, quantity, lineTotal: lineTotalFor({ ...l, quantity }) } : l)),
    );
  }

  increment(key: string): void {
    const line = this.lines().find((l) => l.key === key);
    if (line) this.setQuantity(key, line.quantity + 1);
  }

  decrement(key: string): void {
    const line = this.lines().find((l) => l.key === key);
    if (line) this.setQuantity(key, line.quantity - 1);
  }

  setNote(key: string, note: string): void {
    this.lines.update((lines) => lines.map((l) => (l.key === key ? { ...l, note } : l)));
  }

  remove(key: string): void {
    this.lines.update((lines) => lines.filter((l) => l.key !== key));
  }

  clear(): void {
    this.lines.set([]);
    this.appliedCoupon.set(null);
    this.couponFreeDelivery.set(false);
  }

  open(): void {
    this.isOpen.set(true);
  }
  close(): void {
    this.isOpen.set(false);
  }
  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  setFulfilment(type: FulfilmentType): void {
    this.fulfilment.set(type);
  }

  setDeliveryArea(area: DeliveryArea | null): void {
    this.deliveryArea.set(area);
  }

  quantityOf(menuItemId: ID): number {
    return this.lines()
      .filter((l) => l.menuItemId === menuItemId)
      .reduce((n, l) => n + l.quantity, 0);
  }

  /**
   * Validates a coupon against the current basket.
   *
   * Runs client-side against db.json today. In production this must move to
   * `POST /coupons/validate` so usage limits cannot be bypassed. The return
   * shape is identical, so only the call site changes.
   */
  applyCoupon(coupon: Coupon | undefined, customerId: ID | null): CouponValidation {
    const reject = (reason: string): CouponValidation => ({ valid: false, reason, discount: 0, freeDelivery: false });

    if (!coupon) return reject('That coupon code was not recognised.');
    if (!coupon.isActive) return reject('This coupon is no longer active.');

    const now = Date.now();
    if (new Date(coupon.startsAt).getTime() > now) return reject('This coupon is not valid yet.');
    if (new Date(coupon.expiresAt).getTime() < now) return reject('This coupon has expired.');
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit)
      return reject('This coupon has reached its usage limit.');
    if (this.subtotal() < coupon.minimumOrder)
      return reject(
        `Spend at least Rs ${coupon.minimumOrder.toLocaleString('en-PK')} to use this coupon.`,
      );

    const discount = computeDiscount(coupon, this.subtotal());
    this.appliedCoupon.set(coupon);
    this.couponFreeDelivery.set(coupon.type === 'free-delivery');
    return { valid: true, coupon, discount, freeDelivery: coupon.type === 'free-delivery' };
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
    this.couponFreeDelivery.set(false);
  }

  /** Snapshot of the basket in the shape an order expects. */
  toOrderItems(): OrderItem[] {
    return this.lines().map((l) => ({
      menuItemId: l.menuItemId,
      slug: l.slug,
      name: l.name,
      variantLabel: l.variantLabel,
      image: l.image,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      addons: l.addons.map((a) => ({ name: a.name, price: a.price, quantity: a.quantity })),
      note: l.note,
      lineTotal: l.lineTotal,
    }));
  }
}

export function computeDiscount(coupon: Coupon, subtotal: Money): Money {
  switch (coupon.type) {
    case 'percentage': {
      const raw = Math.round((subtotal * coupon.value) / 100);
      return coupon.maxDiscount !== null ? Math.min(raw, coupon.maxDiscount) : raw;
    }
    case 'fixed':
      return Math.min(coupon.value, subtotal);
    case 'free-delivery':
      return 0;
  }
}

function lineTotalFor(line: Pick<CartLine, 'unitPrice' | 'quantity' | 'addons'>): Money {
  const addons = line.addons.reduce((s, a) => s + a.price * a.quantity, 0);
  return line.unitPrice * line.quantity + addons * line.quantity;
}

function buildLine(input: AddToCartInput): CartLine {
  const addons: CartAddon[] = (input.addons ?? [])
    .filter((a) => a.quantity > 0)
    .map((a) => ({ id: a.addon.id, name: a.addon.name, price: a.addon.price, quantity: a.quantity }));

  // The key merges configurationally identical lines. The note is part of it
  // so "extra spicy" and plain versions of the same dish stay separate.
  const key = [
    input.item.id,
    input.variant.id,
    addons.map((a) => `${a.id}x${a.quantity}`).sort().join('+') || 'none',
    (input.note ?? '').trim().toLowerCase() || 'nonote',
  ].join(':');

  const line: CartLine = {
    key,
    menuItemId: input.item.id,
    slug: input.item.slug,
    name: input.item.name,
    image: input.item.image,
    variantId: input.variant.id,
    variantLabel: input.variant.label,
    unitPrice: input.variant.price,
    quantity: Math.max(1, input.quantity),
    addons,
    note: input.note?.trim() || undefined,
    lineTotal: 0,
  };
  line.lineTotal = lineTotalFor(line);
  return line;
}
