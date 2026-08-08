import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, switchMap } from 'rxjs';
import { OCCASIONS, RESERVATION_STATUS_META, TABLE_ZONES } from '../../core/constants/app.constants';
import {
  Reservation,
  ReservationStatus,
  RestaurantTable,
} from '../../core/models/reservation.model';
import { ReservationService } from '../../core/services/reservation.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { Clock12Pipe, NiceDatePipe } from '../../shared/pipes/format.pipes';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';
import { TabsComponent } from '../../shared/components/ui/navigation.components';
import { ModalComponent } from '../../shared/components/ui/overlay.components';
import {
  AdminHeaderComponent,
  AdminTableComponent,
  AdminToolbarComponent,
  RowActionComponent,
  StatusPillComponent,
} from './shared/admin-ui.components';

@Component({
  selector: 'app-admin-reservations-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    EmptyStateComponent,
    SkeletonComponent,
    TabsComponent,
    ModalComponent,
    AdminHeaderComponent,
    AdminToolbarComponent,
    AdminTableComponent,
    RowActionComponent,
    StatusPillComponent,
    Clock12Pipe,
    NiceDatePipe,
  ],
  template: `
    <app-admin-header
      eyebrow="Operations"
      title="Reservations"
      description="Confirm, assign a table, seat or reject. The customer sees the status immediately."
    />

    <app-tabs class="mt-6" [tabs]="tabs()" [(active)]="statusFilter" ariaLabel="Filter reservations" />

    <app-admin-toolbar
      class="mt-5"
      [(search)]="search"
      placeholder="Search by reference, name or phone"
      [count]="filtered().length"
    >
      <label class="sr-only" for="date">Date</label>
      <input id="date" type="date" class="field h-11 w-auto py-0 sm:w-44" [(ngModel)]="dateFilter" />
      <label class="sr-only" for="zone">Zone</label>
      <select id="zone" class="field h-11 w-auto py-0 sm:w-40" [(ngModel)]="zoneFilter">
        <option value="all">All zones</option>
        @for (zone of zones; track zone.value) {
          <option [value]="zone.value">{{ zone.label }}</option>
        }
      </select>
    </app-admin-toolbar>

    @if (!loaded()) {
      <app-skeleton class="mt-5" height="26rem" rounded="rounded-2xl" />
    } @else if (!filtered().length) {
      <app-empty-state
        class="mt-5"
        icon="calendar"
        title="No reservations match"
        message="Try a different status, date or zone."
        actionLabel="Clear filters"
        (action)="reset()"
      />
    } @else {
      <app-admin-table class="mt-5">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Guest</th>
            <th>When</th>
            <th>Party</th>
            <th>Zone / table</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (r of filtered(); track r.id) {
            <tr>
              <td class="font-semibold text-ink-900">{{ r.reference }}</td>
              <td>
                <span class="block max-w-40 truncate">{{ r.customerName }}</span>
                <span class="block text-caption text-ink-400">{{ r.customerPhone }}</span>
              </td>
              <td>
                <span class="block">{{ r.date | niceDate }}</span>
                <span class="block text-caption text-ink-400">{{ r.time | clock12 }}</span>
              </td>
              <td>
                <span class="font-medium">{{ r.guests }}</span>
                @if (r.occasion) {
                  <span class="block text-caption text-clay-700">{{ occasionLabel(r.occasion) }}</span>
                }
              </td>
              <td>
                <span class="block">{{ zoneLabel(r.zone) }}</span>
                @if (r.tableCode) {
                  <span class="block text-caption text-ink-400">Table {{ r.tableCode }}</span>
                }
              </td>
              <td>
                <app-status-pill [tone]="meta(r.status).tone">{{ meta(r.status).label }}</app-status-pill>
              </td>
              <td>
                <div class="flex items-center justify-end gap-1.5">
                  @if (r.status === 'pending') {
                    <button type="button" class="btn btn-primary btn-sm" (click)="openAssign(r)">
                      Confirm
                    </button>
                    <app-row-action
                      icon="x-circle"
                      label="Reject booking"
                      [danger]="true"
                      (pressed)="openReject(r)"
                    />
                  } @else if (r.status === 'confirmed') {
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="setStatus(r, 'seated')"
                    >
                      Seat
                    </button>
                  } @else if (r.status === 'seated') {
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="setStatus(r, 'completed')"
                    >
                      Complete
                    </button>
                  }
                  @if (r.note) {
                    <app-row-action icon="info" [label]="r.note" (pressed)="showNote(r)" />
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </app-admin-table>
    }

    <!-- Confirm + assign a table -->
    <app-modal
      [(open)]="assignOpen"
      title="Confirm this booking"
      subtitle="Pick a table with enough seats in the requested zone."
      [width]="520"
    >
      @if (active(); as r) {
        <dl class="grid grid-cols-2 gap-4 rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm">
          <div>
            <dt class="text-caption text-ink-500">Guest</dt>
            <dd class="font-medium text-ink-900">{{ r.customerName }}</dd>
          </div>
          <div>
            <dt class="text-caption text-ink-500">Party</dt>
            <dd class="font-medium text-ink-900">{{ r.guests }} guests</dd>
          </div>
          <div>
            <dt class="text-caption text-ink-500">When</dt>
            <dd class="font-medium text-ink-900">{{ r.date | niceDate }}, {{ r.time | clock12 }}</dd>
          </div>
          <div>
            <dt class="text-caption text-ink-500">Zone</dt>
            <dd class="font-medium text-ink-900">{{ zoneLabel(r.zone) }}</dd>
          </div>
        </dl>

        @if (r.note) {
          <p class="mt-4 rounded-lg border border-turmeric-500/30 bg-turmeric-300/15 p-3 text-sm text-ink-700">
            {{ r.note }}
          </p>
        }

        <div class="mt-5">
          <label class="field-label" for="table">Assign a table</label>
          <select id="table" class="field" [(ngModel)]="selectedTableId">
            <option value="">Confirm without assigning</option>
            @for (table of candidateTables(); track table.id) {
              <option [value]="table.id">
                {{ table.code }} &middot; {{ table.seats }} seats
              </option>
            }
          </select>
          @if (!candidateTables().length) {
            <p class="mt-2 text-caption text-amber-700">
              No table in this zone seats {{ r.guests }}. Confirm anyway and seat them manually, or
              reject.
            </p>
          }
        </div>
      }

      <div modalFooter class="flex justify-end gap-3">
        <button type="button" class="btn btn-ghost btn-md" (click)="assignOpen.set(false)">Cancel</button>
        <button type="button" class="btn btn-primary btn-md" [disabled]="busy()" (click)="confirm()">
          Confirm booking
        </button>
      </div>
    </app-modal>

    <!-- Reject -->
    <app-modal [(open)]="rejectOpen" title="Reject this booking" [width]="480">
      <label class="field-label" for="reason">Reason (the guest sees this)</label>
      <select id="reason" class="field" [(ngModel)]="rejectReason">
        @for (reason of rejectReasons; track reason) {
          <option [value]="reason">{{ reason }}</option>
        }
      </select>
      <p class="mt-3 text-caption text-ink-500">
        Please call the guest as well. A rejection with no phone call is how a regular becomes a
        former regular.
      </p>
      <div modalFooter class="flex justify-end gap-3">
        <button type="button" class="btn btn-ghost btn-md" (click)="rejectOpen.set(false)">Cancel</button>
        <button type="button" class="btn btn-danger btn-md" [disabled]="busy()" (click)="reject()">
          Reject booking
        </button>
      </div>
    </app-modal>
  `,
})
export class AdminReservationsPage {
  private readonly service = inject(ReservationService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly zones = TABLE_ZONES;
  protected readonly rejectReasons = [
    'Fully booked at that time',
    'Family hall reserved for a private event',
    'Requested party size exceeds capacity',
    'Restaurant closed for a private function',
  ];

  protected readonly search = signal('');
  protected readonly statusFilter = signal('pending');
  protected readonly zoneFilter = signal('all');
  protected readonly dateFilter = signal('');
  protected readonly assignOpen = signal(false);
  protected readonly rejectOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly active = signal<Reservation | null>(null);
  protected readonly selectedTableId = signal('');
  protected readonly rejectReason = signal(this.rejectReasons[0]);
  private readonly reload = signal(0);

  private readonly data = toSignal(
    toObservable(this.reload).pipe(
      switchMap(() => forkJoin({ reservations: this.service.all(), tables: this.service.tables() })),
    ),
    { initialValue: { reservations: [] as Reservation[], tables: [] as RestaurantTable[] } },
  );

  protected readonly loaded = computed(
    () => this.data().reservations.length > 0 || this.reload() > 0,
  );

  protected readonly tabs = computed(() => {
    const all = this.data().reservations;
    const count = (status: ReservationStatus) => all.filter((r) => r.status === status).length;
    return [
      { id: 'pending', label: 'Awaiting', count: count('pending') },
      { id: 'confirmed', label: 'Confirmed', count: count('confirmed') },
      { id: 'seated', label: 'Seated', count: count('seated') },
      { id: 'completed', label: 'Completed', count: count('completed') },
      { id: 'all', label: 'All', count: all.length },
    ];
  });

  protected readonly filtered = computed(() => {
    const needle = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const zone = this.zoneFilter();
    const date = this.dateFilter();

    return this.data()
      .reservations.filter((r) => {
        if (status !== 'all' && r.status !== status) return false;
        if (zone !== 'all' && r.zone !== zone) return false;
        if (date && r.date !== date) return false;
        if (!needle) return true;
        return `${r.reference} ${r.customerName} ${r.customerPhone}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date < b.date ? 1 : -1));
  });

  /** Active tables in the requested zone with enough seats. */
  protected readonly candidateTables = computed(() => {
    const r = this.active();
    if (!r) return [];
    return this.data()
      .tables.filter((t) => t.zone === r.zone && t.isActive && !t.isComingSoon && t.seats >= r.guests)
      .sort((a, b) => a.seats - b.seats);
  });

  constructor() {
    this.seo.apply({
      title: 'Reservations | Salateen Admin',
      description: 'Manage table bookings.',
      path: 'admin/reservations',
      noIndex: true,
    });
  }

  protected meta(status: ReservationStatus) {
    return RESERVATION_STATUS_META[status];
  }
  protected zoneLabel(zone: string): string {
    return TABLE_ZONES.find((z) => z.value === zone)?.label ?? zone;
  }
  protected occasionLabel(occasion: string): string {
    return OCCASIONS.find((o) => o.value === occasion)?.label ?? occasion;
  }

  protected openAssign(r: Reservation): void {
    this.active.set(r);
    this.selectedTableId.set(this.candidateTables()[0]?.id ?? '');
    this.assignOpen.set(true);
  }

  protected openReject(r: Reservation): void {
    this.active.set(r);
    this.rejectReason.set(this.rejectReasons[0]);
    this.rejectOpen.set(true);
  }

  protected showNote(r: Reservation): void {
    this.toast.info(`Note on ${r.reference}`, r.note);
  }

  protected confirm(): void {
    const r = this.active();
    if (!r) return;
    this.busy.set(true);
    const tableId = this.selectedTableId() || null;
    const code = this.data().tables.find((t) => t.id === tableId)?.code;

    this.service.confirm(r.id, tableId, code).subscribe({
      next: () => {
        this.busy.set(false);
        this.assignOpen.set(false);
        this.reload.update((n) => n + 1);
        this.toast.success(`${r.reference} confirmed`, code ? `Table ${code} assigned.` : undefined);
      },
      error: () => {
        this.busy.set(false);
        this.toast.error('That did not save');
      },
    });
  }

  protected reject(): void {
    const r = this.active();
    if (!r) return;
    this.busy.set(true);
    this.service.reject(r.id, this.rejectReason()).subscribe({
      next: () => {
        this.busy.set(false);
        this.rejectOpen.set(false);
        this.reload.update((n) => n + 1);
        this.toast.info(`${r.reference} rejected`, 'Please call the guest as well.');
      },
      error: () => {
        this.busy.set(false);
        this.toast.error('That did not save');
      },
    });
  }

  protected setStatus(r: Reservation, status: ReservationStatus): void {
    this.service.setStatus(r.id, status).subscribe({
      next: () => {
        this.reload.update((n) => n + 1);
        this.toast.success(`${r.reference}: ${RESERVATION_STATUS_META[status].label}`);
      },
      error: () => this.toast.error('That did not update'),
    });
  }

  protected reset(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.zoneFilter.set('all');
    this.dateFilter.set('');
  }
}
