import { Address, ID, IsoDateTime, Money, Timestamped } from './common.model';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out-for-delivery'
  | 'delivered'
  | 'cancelled';

/** No online payment in this build. Cash only, mirroring the real restaurant. */
export type PaymentMethod = 'cash-on-delivery' | 'cash-at-counter';

export type FulfilmentType = 'delivery' | 'dine-in';

export interface CartAddon {
  id: ID;
  name: string;
  price: Money;
  quantity: number;
}

export interface CartLine {
  /** Stable composite key so identical configurations merge into one line. */
  key: string;
  menuItemId: ID;
  slug: string;
  name: string;
  image: string;
  variantId: ID;
  variantLabel: string;
  unitPrice: Money;
  quantity: number;
  addons: CartAddon[];
  note?: string;
  lineTotal: Money;
}

export interface CartTotals {
  itemCount: number;
  subtotal: Money;
  discount: Money;
  deliveryFee: Money;
  tax: Money;
  grandTotal: Money;
}

export interface OrderItem {
  menuItemId: ID;
  slug: string;
  name: string;
  variantLabel: string;
  image: string;
  unitPrice: Money;
  quantity: number;
  addons: { name: string; price: Money; quantity: number }[];
  note?: string;
  lineTotal: Money;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  at: IsoDateTime;
  note?: string;
  byName?: string;
}

export interface Order extends Timestamped {
  id: ID;
  /** Human-facing reference, e.g. SLT-24081. What the customer quotes by phone. */
  reference: string;
  customerId: ID | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  fulfilment: FulfilmentType;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: Money;
  discount: Money;
  couponCode?: string;
  deliveryFee: Money;
  tax: Money;
  grandTotal: Money;
  deliveryAddress?: Address;
  deliveryAreaId?: ID;
  reservationId?: ID;
  scheduledFor?: IsoDateTime;
  estimatedReadyAt?: IsoDateTime;
  note?: string;
  timeline: OrderTimelineEntry[];
  cancelReason?: string;
  assignedRiderName?: string;
  placedVia: 'web' | 'phone' | 'walk-in';
}

export interface PlaceOrderPayload {
  customerId: ID | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  fulfilment: FulfilmentType;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: Money;
  discount: Money;
  couponCode?: string;
  deliveryFee: Money;
  tax: Money;
  grandTotal: Money;
  deliveryAddress?: Address;
  deliveryAreaId?: ID;
  reservationId?: ID;
  note?: string;
}

export interface DeliveryArea extends Timestamped {
  id: ID;
  name: string;
  city: string;
  fee: Money;
  freeDeliveryAbove: Money | null;
  minimumOrder: Money;
  estimatedMinutes: number;
  isActive: boolean;
  landmarks: string[];
}

export type CouponType = 'percentage' | 'fixed' | 'free-delivery';

export interface Coupon extends Timestamped {
  id: ID;
  code: string;
  title: string;
  description: string;
  type: CouponType;
  value: number;
  minimumOrder: Money;
  maxDiscount: Money | null;
  usageLimit: number;
  usedCount: number;
  perCustomerLimit: number;
  startsAt: IsoDateTime;
  expiresAt: IsoDateTime;
  isActive: boolean;
}

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  coupon?: Coupon;
  discount: Money;
  freeDelivery: boolean;
}
