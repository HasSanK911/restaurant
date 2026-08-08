import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, switchMap } from 'rxjs';
import {
  InventoryItem,
  InventoryMovement,
  StockSeverity,
  Supplier,
} from '../../core/models/inventory.model';
import { AdminService, toStockAlert } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';
import { HumanisePipe, NiceDatePipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { StatCardComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';
import { ModalComponent } from '../../shared/components/ui/overlay.components';
import {
  AdminHeaderComponent,
  AdminTableComponent,
  AdminToolbarComponent,
  RowActionComponent,
  StatusPillComponent,
} from './shared/admin-ui.components';

const CATEGORIES = [
  'meat',
  'poultry',
  'seafood',
  'vegetables',
  'rice-grains',
  'spices',
  'dairy',
  'oils',
  'beverages',
  'bakery',
  'disposables',
  'fuel',
] as const;

@Component({
  selector: 'app-admin-inventory-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    IconComponent,
    StatCardComponent,
    EmptyStateComponent,
    SkeletonComponent,
    ModalComponent,
    AdminHeaderComponent,
    AdminToolbarComponent,
    AdminTableComponent,
    RowActionComponent,
    StatusPillComponent,
    CurrencyPkrPipe,
    HumanisePipe,
    NiceDatePipe,
  ],
  template: `
    <app-admin-header
      eyebrow="Store room"
      title="Inventory"
      description="Stock on hand, reorder levels and expiry. Every movement is logged."
    >
      <a routerLink="/admin/inventory-logs" class="btn btn-secondary btn-md">
        <app-icon name="list" [size]="15" />
        Movement logs
      </a>
    </app-admin-header>

    <!-- Summary -->
    <div class="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <app-stat-card label="Items tracked" [value]="items().length" icon="box" [hint]="'Across ' + categoryCount() + ' categories'" />
      <app-stat-card label="Stock value" [value]="stockValue()" icon="wallet" hint="At last purchase cost" />
      <app-stat-card label="Below reorder" [value]="lowCount()" icon="alert" hint="Needs a purchase order" />
      <app-stat-card label="Expiring soon" [value]="expiringCount()" icon="clock" hint="Within three days" />
    </div>

    <app-admin-toolbar
      class="mt-6"
      [(search)]="search"
      placeholder="Search by name or SKU"
      [count]="filtered().length"
    >
      <label class="sr-only" for="cat">Category</label>
      <select id="cat" class="field h-11 w-auto py-0 sm:w-44" [(ngModel)]="category">
        <option value="all">All categories</option>
        @for (cat of categories; track cat) {
          <option [value]="cat">{{ cat | humanise }}</option>
        }
      </select>
      <label class="sr-only" for="severity">Stock level</label>
      <select id="severity" class="field h-11 w-auto py-0 sm:w-40" [(ngModel)]="severity">
        <option value="all">All levels</option>
        <option value="critical">Critical</option>
        <option value="low">Low</option>
        <option value="expiring">Expiring</option>
        <option value="healthy">Healthy</option>
      </select>
    </app-admin-toolbar>

    @if (!loaded()) {
      <app-skeleton class="mt-5" height="28rem" rounded="rounded-2xl" />
    } @else if (!filtered().length) {
      <app-empty-state
        class="mt-5"
        icon="box"
        title="Nothing matches"
        message="Try another category or clear the search."
        actionLabel="Clear filters"
        (action)="reset()"
      />
    } @else {
      <app-admin-table class="mt-5">
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th>On hand</th>
            <th>Reorder at</th>
            <th>Unit cost</th>
            <th>Supplier</th>
            <th>Expiry</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (row of filtered(); track row.item.id) {
            <tr>
              <td>
                <span class="block font-medium text-ink-900">{{ row.item.name }}</span>
                <span class="block font-mono text-caption text-ink-400">{{ row.item.sku }}</span>
              </td>
              <td class="text-ink-500">{{ row.item.category | humanise }}</td>
              <td>
                <span class="font-semibold tabular-nums" [class]="quantityClass(row.severity)">
                  {{ row.item.quantity }} {{ row.item.unit }}
                </span>
                <span class="mt-1 block h-1.5 w-20 overflow-hidden rounded-full bg-ink-200">
                  <span
                    class="block h-full rounded-full transition-[width]"
                    [class]="barClass(row.severity)"
                    [style.width.%]="fillPercent(row.item)"
                  ></span>
                </span>
              </td>
              <td class="text-ink-500 tabular-nums">{{ row.item.reorderLevel }} {{ row.item.unit }}</td>
              <td class="tabular-nums">{{ row.item.unitCost | pkr }}</td>
              <td class="max-w-36 truncate text-ink-500">{{ supplierName(row.item.supplierId) }}</td>
              <td class="text-caption">
                {{ row.item.expiryDate ? (row.item.expiryDate | niceDate) : '--' }}
              </td>
              <td>
                <app-status-pill [tone]="severityTone(row.severity)">{{ row.severity }}</app-status-pill>
              </td>
              <td>
                <div class="flex items-center justify-end gap-1.5">
                  <button type="button" class="btn btn-secondary btn-sm" (click)="openMovement(row.item, 'purchase')">
                    <app-icon name="plus" [size]="12" [strokeWidth]="2.4" />
                    Restock
                  </button>
                  <app-row-action
                    icon="minus"
                    label="Record consumption"
                    (pressed)="openMovement(row.item, 'kitchen-consumption')"
                  />
                  <app-row-action
                    icon="trash"
                    label="Record wastage"
                    [danger]="true"
                    (pressed)="openMovement(row.item, 'wastage')"
                  />
                </div>
              </td>
            </tr>
          }
        </tbody>
      </app-admin-table>
    }

    <!-- Movement modal -->
    <app-modal [(open)]="movementOpen" [title]="movementTitle()" [width]="480">
      @if (activeItem(); as item) {
        <div class="rounded-xl border border-ink-200 bg-ink-50 p-4">
          <p class="font-medium text-ink-900">{{ item.name }}</p>
          <p class="mt-0.5 text-caption text-ink-500">
            Currently {{ item.quantity }} {{ item.unit }} on hand &middot; reorder at
            {{ item.reorderLevel }} {{ item.unit }}
          </p>
        </div>

        <div class="mt-5">
          <label class="field-label" for="qty">
            Quantity in {{ item.unit }}
          </label>
          <input id="qty" type="number" class="field" min="0" step="0.1" [(ngModel)]="quantity" />
          <p class="mt-2 text-caption text-ink-500">
            New balance:
            <span class="font-semibold text-ink-900">{{ projectedBalance(item) }} {{ item.unit }}</span>
            @if (movementKind() === 'purchase') {
              &middot; cost {{ projectedCost(item) | pkr }}
            }
          </p>
        </div>

        <div class="mt-4">
          <label class="field-label" for="movenote">Note</label>
          <input
            id="movenote"
            type="text"
            class="field"
            [placeholder]="notePlaceholder()"
            [(ngModel)]="note"
          />
        </div>
      }

      <div modalFooter class="flex justify-end gap-3">
        <button type="button" class="btn btn-ghost btn-md" (click)="movementOpen.set(false)">Cancel</button>
        <button
          type="button"
          class="btn btn-md"
          [class]="movementKind() === 'wastage' ? 'btn-danger' : 'btn-primary'"
          [disabled]="busy() || quantity() <= 0"
          (click)="saveMovement()"
        >
          Record it
        </button>
      </div>
    </app-modal>
  `,
})
export class AdminInventoryPage {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly categories = CATEGORIES;
  protected readonly search = signal('');
  protected readonly category = signal('all');
  protected readonly severity = signal('all');
  protected readonly movementOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly activeItem = signal<InventoryItem | null>(null);
  protected readonly movementKind = signal<InventoryMovement>('purchase');
  protected readonly quantity = signal(0);
  protected readonly note = signal('');
  private readonly reload = signal(0);

  private readonly data = toSignal(
    toObservable(this.reload).pipe(
      switchMap(() => forkJoin({ items: this.admin.inventory(), suppliers: this.admin.suppliers() })),
    ),
    { initialValue: { items: [] as InventoryItem[], suppliers: [] as Supplier[] } },
  );

  protected readonly items = computed(() => this.data().items);
  protected readonly loaded = computed(() => this.items().length > 0 || this.reload() > 0);

  private readonly alerts = computed(() => this.items().map(toStockAlert));

  protected readonly filtered = computed(() => {
    const needle = this.search().trim().toLowerCase();
    const category = this.category();
    const severity = this.severity();

    return this.alerts()
      .filter((row) => {
        if (category !== 'all' && row.item.category !== category) return false;
        if (severity !== 'all' && row.severity !== severity) return false;
        if (!needle) return true;
        return `${row.item.name} ${row.item.sku}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => {
        const order: Record<StockSeverity, number> = { critical: 0, expiring: 1, low: 2, healthy: 3 };
        return order[a.severity] - order[b.severity] || a.item.name.localeCompare(b.item.name);
      });
  });

  protected readonly lowCount = computed(
    () => this.alerts().filter((a) => a.severity === 'critical' || a.severity === 'low').length,
  );
  protected readonly expiringCount = computed(
    () => this.alerts().filter((a) => a.severity === 'expiring').length,
  );
  protected readonly categoryCount = computed(
    () => new Set(this.items().map((i) => i.category)).size,
  );
  protected readonly stockValue = computed(() => {
    const total = this.items().reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    return `Rs ${Math.round(total).toLocaleString('en-PK')}`;
  });

  protected readonly movementTitle = computed(
    () =>
      ({
        purchase: 'Record a delivery',
        'kitchen-consumption': 'Record kitchen usage',
        wastage: 'Record wastage',
        return: 'Record a return',
        adjustment: 'Adjust the count',
      })[this.movementKind()],
  );

  protected readonly notePlaceholder = computed(
    () =>
      ({
        purchase: 'GRN reference, supplier note...',
        'kitchen-consumption': 'Which service, which section...',
        wastage: 'Spoiled in the chiller, dropped during prep...',
        return: 'Reason for the return...',
        adjustment: 'Physical count correction',
      })[this.movementKind()],
  );

  constructor() {
    this.seo.apply({
      title: 'Inventory | Salateen Admin',
      description: 'Stock control.',
      path: 'admin/inventory',
      noIndex: true,
    });
  }

  protected supplierName(id: string): string {
    return this.data().suppliers.find((s) => s.id === id)?.name ?? 'Unassigned';
  }

  protected fillPercent(item: InventoryItem): number {
    if (item.reorderLevel <= 0) return 100;
    return Math.min(100, Math.round((item.quantity / (item.reorderLevel * 3)) * 100));
  }

  protected quantityClass(severity: StockSeverity): string {
    return {
      critical: 'text-red-600',
      low: 'text-amber-700',
      expiring: 'text-turmeric-600',
      healthy: 'text-ink-900',
    }[severity];
  }

  protected barClass(severity: StockSeverity): string {
    return {
      critical: 'bg-red-500',
      low: 'bg-amber-500',
      expiring: 'bg-turmeric-500',
      healthy: 'bg-basil-500',
    }[severity];
  }

  protected severityTone(severity: StockSeverity): string {
    return { critical: 'red', low: 'amber', expiring: 'turmeric', healthy: 'emerald' }[severity];
  }

  protected openMovement(item: InventoryItem, kind: InventoryMovement): void {
    this.activeItem.set(item);
    this.movementKind.set(kind);
    this.quantity.set(kind === 'purchase' ? item.reorderQuantity : 1);
    this.note.set('');
    this.movementOpen.set(true);
  }

  private signedQuantity(): number {
    const magnitude = Math.abs(this.quantity());
    return this.movementKind() === 'purchase' || this.movementKind() === 'return'
      ? magnitude
      : -magnitude;
  }

  protected projectedBalance(item: InventoryItem): number {
    return Math.max(0, Math.round((item.quantity + this.signedQuantity()) * 100) / 100);
  }

  protected projectedCost(item: InventoryItem): number {
    return Math.round(item.unitCost * Math.abs(this.quantity()));
  }

  protected saveMovement(): void {
    const item = this.activeItem();
    if (!item || this.quantity() <= 0) return;

    this.busy.set(true);
    this.admin
      .recordMovement(
        item,
        this.movementKind(),
        this.signedQuantity(),
        this.auth.user()?.name ?? 'Admin',
        this.note().trim() || undefined,
      )
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.movementOpen.set(false);
          this.reload.update((n) => n + 1);
          this.toast.success('Movement recorded', `${item.name} updated.`);
        },
        error: () => {
          this.busy.set(false);
          this.toast.error('That did not save');
        },
      });
  }

  protected reset(): void {
    this.search.set('');
    this.category.set('all');
    this.severity.set('all');
  }
}
