import { ID, IsoDate, IsoDateTime, Money, Timestamped } from './common.model';

export type InventoryUnit = 'kg' | 'g' | 'litre' | 'ml' | 'piece' | 'packet' | 'dozen' | 'bundle';

export type InventoryCategory =
  | 'meat'
  | 'poultry'
  | 'seafood'
  | 'vegetables'
  | 'rice-grains'
  | 'spices'
  | 'dairy'
  | 'oils'
  | 'beverages'
  | 'bakery'
  | 'disposables'
  | 'fuel';

export interface Supplier extends Timestamped {
  id: ID;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  categories: InventoryCategory[];
  paymentTerms: string;
  rating: number;
  isActive: boolean;
}

export interface InventoryItem extends Timestamped {
  id: ID;
  sku: string;
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  /** Quantity currently on hand, expressed in `unit`. */
  quantity: number;
  /** Crossing below this raises a low-stock alert on the dashboard. */
  reorderLevel: number;
  reorderQuantity: number;
  unitCost: Money;
  supplierId: ID;
  storageLocation: string;
  expiryDate?: IsoDate;
  lastRestockedAt?: IsoDateTime;
  isPerishable: boolean;
  isActive: boolean;
}

export type InventoryMovement =
  | 'purchase'
  | 'kitchen-consumption'
  | 'wastage'
  | 'return'
  | 'adjustment';

export interface InventoryLog extends Timestamped {
  id: ID;
  inventoryItemId: ID;
  itemName: string;
  movement: InventoryMovement;
  /** Signed: positive adds stock, negative removes it. */
  quantityChange: number;
  quantityAfter: number;
  unitCost?: Money;
  totalCost?: Money;
  reference?: string;
  relatedOrderId?: ID;
  supplierId?: ID;
  performedByName: string;
  note?: string;
}

export type StockSeverity = 'critical' | 'low' | 'expiring' | 'healthy';

export interface StockAlert {
  item: InventoryItem;
  severity: StockSeverity;
  message: string;
}
