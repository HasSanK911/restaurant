import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { TABLE_ZONES } from '../../core/constants/app.constants';
import { ID } from '../../core/models/common.model';
import { DeliveryArea } from '../../core/models/order.model';
import { RestaurantTable } from '../../core/models/reservation.model';
import { InventoryLog, Supplier } from '../../core/models/inventory.model';
import { AdminService } from '../../core/services/admin.service';
import { SeoService } from '../../core/services/seo.service';
import {
  ResourceColumn,
  ResourceField,
  ResourcePageComponent,
} from './shared/resource-page.component';

const money = (value: number | undefined | null) =>
  value === null || value === undefined ? '--' : `Rs ${Math.round(value).toLocaleString('en-PK')}`;

const dateTime = (iso: string | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--';

/* ----------------------------------------------------------------- tables -- */

@Component({
  selector: 'app-admin-tables-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Operations"
      title="Tables"
      description="The floor plan the reservation system books against."
      singular="table"
      createLabel="Add table"
      searchPlaceholder="Search by code or zone"
      emptyIcon="table"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [fields]="fields"
      [searchable]="searchable"
      [canCreate]="true"
      [canEdit]="true"
      [canDelete]="true"
      [blank]="blank"
      [onCreate]="create"
      [onUpdate]="update"
      [onDelete]="remove"
      [onChanged]="refresh"
      [perPage]="30"
    />
  `,
})
export class AdminTablesPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.tables())),
    { initialValue: [] as RestaurantTable[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<RestaurantTable>[] = [
    { header: 'Code', kind: 'strong', value: (r) => r.code, sub: (r) => this.zoneLabel(r.zone) },
    { header: 'Seats', value: (r) => r.seats },
    { header: 'Minimum party', kind: 'muted', value: (r) => r.minGuests, hideBelow: 'md' },
    { header: 'Notes', kind: 'muted', value: (r) => r.notes ?? '--', hideBelow: 'lg' },
    {
      header: 'Status',
      kind: 'status',
      value: (r) => (r.isComingSoon ? 'Coming soon' : r.isActive ? 'Bookable' : 'Out of service'),
      tone: (r) => (r.isComingSoon ? 'amber' : r.isActive ? 'emerald' : 'ink'),
    },
    {
      header: 'Active',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isActive,
      onToggle: (r, v) => this.patch(r.id, { isActive: v }),
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'code', label: 'Table code', required: true, hint: 'T01, F03, L02, R01' },
    {
      key: 'zone',
      label: 'Zone',
      type: 'select',
      options: TABLE_ZONES.map((z) => ({ value: z.value, label: z.label })),
    },
    { key: 'seats', label: 'Seats', type: 'number', required: true },
    { key: 'minGuests', label: 'Minimum party', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'textarea', span: 2 },
    { key: 'isActive', label: 'Bookable', type: 'checkbox' },
    { key: 'isComingSoon', label: 'Coming soon (not yet open)', type: 'checkbox' },
  ];

  protected readonly blank = {
    code: '',
    zone: 'indoor',
    seats: 4,
    minGuests: 1,
    notes: '',
    isActive: true,
    isComingSoon: false,
  };

  protected readonly searchable = (r: RestaurantTable) => `${r.code} ${r.zone} ${r.notes ?? ''}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createTable({ ...this.blank, createdAt: new Date().toISOString(), ...value } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateTable(id, value as never);
  protected readonly remove = (id: ID) => this.admin.deleteTable(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({ title: 'Tables | Salateen Admin', description: '', path: 'admin/tables', noIndex: true });
  }

  private zoneLabel(zone: string): string {
    return TABLE_ZONES.find((z) => z.value === zone)?.label ?? zone;
  }

  private patch(id: ID, value: Partial<RestaurantTable>): void {
    this.admin.updateTable(id, value).subscribe(() => this.refresh());
  }
}

/* --------------------------------------------------------- delivery areas -- */

@Component({
  selector: 'app-delivery-areas-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Operations"
      title="Delivery areas"
      description="Where riders go, what it costs and the minimum order for each zone. These appear at checkout."
      singular="area"
      createLabel="Add area"
      searchPlaceholder="Search areas"
      emptyIcon="map"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [fields]="fields"
      [searchable]="searchable"
      [canCreate]="true"
      [canEdit]="true"
      [canDelete]="true"
      [blank]="blank"
      [onCreate]="create"
      [onUpdate]="update"
      [onDelete]="remove"
      [onChanged]="refresh"
    />
  `,
})
export class DeliveryAreasPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.deliveryAreas())),
    { initialValue: [] as DeliveryArea[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<DeliveryArea>[] = [
    { header: 'Area', kind: 'strong', value: (r) => r.name, sub: (r) => r.city },
    { header: 'Charge', kind: 'money', value: (r) => money(r.fee) },
    { header: 'Minimum order', kind: 'money', value: (r) => money(r.minimumOrder) },
    {
      header: 'Free above',
      kind: 'muted',
      value: (r) => (r.freeDeliveryAbove ? money(r.freeDeliveryAbove) : 'Never'),
      hideBelow: 'md',
    },
    { header: 'Estimate', kind: 'muted', value: (r) => `${r.estimatedMinutes} min` },
    { header: 'Landmarks', kind: 'chips', value: () => '', chips: (r) => r.landmarks, hideBelow: 'lg' },
    {
      header: 'Delivering',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isActive,
      onToggle: (r, v) => this.patch(r.id, { isActive: v }),
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'name', label: 'Area name', required: true },
    { key: 'city', label: 'City', required: true },
    { key: 'fee', label: 'Delivery charge (Rs)', type: 'number', required: true },
    { key: 'minimumOrder', label: 'Minimum order (Rs)', type: 'number', required: true },
    { key: 'freeDeliveryAbove', label: 'Free delivery above (Rs)', type: 'number' },
    { key: 'estimatedMinutes', label: 'Estimated minutes', type: 'number' },
    { key: 'isActive', label: 'Currently delivering here', type: 'checkbox' },
  ];

  protected readonly blank = {
    name: '',
    city: 'Swabi',
    fee: 150,
    minimumOrder: 2000,
    freeDeliveryAbove: 2500,
    estimatedMinutes: 40,
    landmarks: [],
    isActive: true,
  };

  protected readonly searchable = (r: DeliveryArea) => `${r.name} ${r.city}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createDeliveryArea({
      ...this.blank,
      createdAt: new Date().toISOString(),
      ...value,
    } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateDeliveryArea(id, value as never);
  protected readonly remove = (id: ID) => this.admin.deleteDeliveryArea(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({
      title: 'Delivery Areas | Salateen Admin',
      description: '',
      path: 'admin/delivery-areas',
      noIndex: true,
    });
  }

  private patch(id: ID, value: Partial<DeliveryArea>): void {
    this.admin.updateDeliveryArea(id, value).subscribe(() => this.refresh());
  }
}

/* -------------------------------------------------------------- suppliers -- */

@Component({
  selector: 'app-admin-suppliers-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Inventory"
      title="Suppliers"
      description="Who we buy from, what they supply and on what terms."
      singular="supplier"
      createLabel="Add supplier"
      searchPlaceholder="Search suppliers"
      emptyIcon="truck"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [fields]="fields"
      [searchable]="searchable"
      [canCreate]="true"
      [canEdit]="true"
      [canDelete]="true"
      [blank]="blank"
      [onCreate]="create"
      [onUpdate]="update"
      [onDelete]="remove"
      [onChanged]="refresh"
    />
  `,
})
export class AdminSuppliersPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.suppliers())),
    { initialValue: [] as Supplier[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<Supplier>[] = [
    { header: 'Supplier', kind: 'strong', value: (r) => r.name, sub: (r) => r.contactPerson },
    { header: 'Phone', kind: 'muted', value: (r) => r.phone },
    { header: 'Supplies', kind: 'chips', value: () => '', chips: (r) => r.categories, hideBelow: 'md' },
    { header: 'Terms', kind: 'muted', value: (r) => r.paymentTerms, hideBelow: 'lg' },
    { header: 'Rating', value: (r) => r.rating.toFixed(1) },
    {
      header: 'Active',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isActive,
      onToggle: (r, v) => this.patch(r.id, { isActive: v }),
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'name', label: 'Business name', required: true },
    { key: 'contactPerson', label: 'Contact person', required: true },
    { key: 'phone', label: 'Phone', required: true },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Address', type: 'textarea', span: 2 },
    { key: 'paymentTerms', label: 'Payment terms', hint: 'Net 7 days, cash on delivery...' },
    { key: 'rating', label: 'Rating out of 5', type: 'number' },
    { key: 'isActive', label: 'Currently buying from them', type: 'checkbox' },
  ];

  protected readonly blank = {
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    categories: [],
    paymentTerms: 'Cash on delivery',
    rating: 4,
    isActive: true,
  };

  protected readonly searchable = (r: Supplier) => `${r.name} ${r.contactPerson} ${r.phone}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createSupplier({ ...this.blank, createdAt: new Date().toISOString(), ...value } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateSupplier(id, value as never);
  protected readonly remove = (id: ID) => this.admin.deleteSupplier(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({ title: 'Suppliers | Salateen Admin', description: '', path: 'admin/suppliers', noIndex: true });
  }

  private patch(id: ID, value: Partial<Supplier>): void {
    this.admin.updateSupplier(id, value).subscribe(() => this.refresh());
  }
}

/* --------------------------------------------------------- inventory logs -- */

@Component({
  selector: 'app-inventory-logs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="Inventory"
      title="Movement logs"
      description="Every purchase, kitchen draw, wastage and correction, newest first. This is the audit trail."
      singular="movement"
      searchPlaceholder="Search by item, reference or person"
      emptyIcon="list"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [searchable]="searchable"
      [perPage]="25"
    />
  `,
})
export class InventoryLogsPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);

  protected readonly rows = toSignal(this.admin.inventoryLogs(), {
    initialValue: [] as InventoryLog[],
  });
  protected readonly loading = computed(() => this.rows().length === 0);

  protected readonly columns: ResourceColumn<InventoryLog>[] = [
    { header: 'When', kind: 'date', value: (r) => dateTime(r.createdAt) },
    { header: 'Item', kind: 'strong', value: (r) => r.itemName, sub: (r) => r.note ?? '' },
    {
      header: 'Movement',
      kind: 'status',
      value: (r) => this.movementLabel(r.movement),
      tone: (r) => this.movementTone(r.movement),
    },
    {
      header: 'Change',
      value: (r) => `${r.quantityChange > 0 ? '+' : ''}${r.quantityChange}`,
      align: 'right',
    },
    { header: 'Balance after', kind: 'muted', value: (r) => r.quantityAfter, align: 'right', hideBelow: 'md' },
    { header: 'Cost', kind: 'money', value: (r) => (r.totalCost ? money(r.totalCost) : '--'), hideBelow: 'lg' },
    { header: 'By', kind: 'muted', value: (r) => r.performedByName, hideBelow: 'md' },
    { header: 'Reference', kind: 'muted', value: (r) => r.reference ?? '--', hideBelow: 'lg' },
  ];

  protected readonly searchable = (r: InventoryLog) =>
    `${r.itemName} ${r.movement} ${r.performedByName} ${r.reference ?? ''} ${r.note ?? ''}`;

  constructor() {
    this.seo.apply({
      title: 'Inventory Logs | Salateen Admin',
      description: '',
      path: 'admin/inventory-logs',
      noIndex: true,
    });
  }

  private movementLabel(movement: string): string {
    return {
      purchase: 'Purchase',
      'kitchen-consumption': 'Kitchen',
      wastage: 'Wastage',
      return: 'Return',
      adjustment: 'Adjustment',
    }[movement] ?? movement;
  }

  private movementTone(movement: string): string {
    return {
      purchase: 'emerald',
      'kitchen-consumption': 'basil',
      wastage: 'red',
      return: 'amber',
      adjustment: 'ink',
    }[movement] ?? 'ink';
  }
}
