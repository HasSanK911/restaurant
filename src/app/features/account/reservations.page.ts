import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { OCCASIONS, RESERVATION_STATUS_META, TABLE_ZONES } from '../../core/constants/app.constants';
import { Reservation } from '../../core/models/reservation.model';
import { AuthService } from '../../core/services/auth.service';
import { ReservationService } from '../../core/services/reservation.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { Clock12Pipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { BadgeComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent } from '../../shared/components/ui/feedback.components';
import { ConfirmDialogComponent } from '../../shared/components/ui/overlay.components';
import { TabsComponent } from '../../shared/components/ui/navigation.components';

@Component({
  selector: 'app-account-reservations-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    BadgeComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    TabsComponent,
    Clock12Pipe,
  ],
  template: `
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="font-display text-2xl">My reservations</h2>
        <p class="mt-1.5 text-sm text-ink-600">
          Bookings are confirmed by the manager. Cancelling is free and takes one tap.
        </p>
      </div>
      <a routerLink="/reservation" class="btn btn-primary btn-md">
        <app-icon name="calendar" [size]="15" />
        Book a table
      </a>
    </div>

    <app-tabs class="mt-6" [tabs]="tabs()" [(active)]="filter" ariaLabel="Filter reservations" />

    @if (visible().length) {
      <ul class="mt-6 space-y-4">
        @for (r of visible(); track r.id) {
          <li>
            <article class="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <!-- Date block -->
              <div
                class="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-ink-200 bg-ink-50"
              >
                <span class="font-display text-2xl leading-none text-ink-900">{{ dayOf(r.date) }}</span>
                <span class="mt-0.5 text-micro uppercase">{{ monthOf(r.date) }}</span>
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2.5">
                  <span class="font-display text-lg">{{ r.reference }}</span>
                  <app-badge [tone]="$any(meta(r).tone)" [dot]="true">{{ meta(r).label }}</app-badge>
                </div>
                <p class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
                  <span class="flex items-center gap-1.5">
                    <app-icon name="clock" [size]="13" class="text-clay-600" />
                    {{ r.time | clock12 }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <app-icon name="users" [size]="13" class="text-clay-600" />
                    {{ r.guests }} guests
                  </span>
                  <span class="flex items-center gap-1.5">
                    <app-icon name="table" [size]="13" class="text-clay-600" />
                    {{ zoneLabel(r.zone) }}{{ r.tableCode ? ' · ' + r.tableCode : '' }}
                  </span>
                </p>
                @if (r.occasion) {
                  <p class="mt-1 text-caption text-clay-700">{{ occasionLabel(r.occasion) }}</p>
                }
                @if (r.note) {
                  <p class="mt-1 text-caption text-ink-500">{{ r.note }}</p>
                }
                @if (r.status === 'rejected' && r.rejectionReason) {
                  <p class="mt-2 flex items-start gap-1.5 text-caption text-red-700">
                    <app-icon name="info" [size]="12" class="mt-0.5" />
                    {{ r.rejectionReason }}
                  </p>
                }
              </div>

              <div class="flex shrink-0 flex-wrap gap-2">
                <a
                  [routerLink]="['/reservation/confirmation', r.id]"
                  class="btn btn-secondary btn-sm"
                  >View</a
                >
                @if (canCancel(r)) {
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm border border-ink-300"
                    (click)="askCancel(r)"
                  >
                    Cancel
                  </button>
                }
              </div>
            </article>
          </li>
        }
      </ul>
    } @else {
      <app-empty-state
        class="mt-6"
        icon="calendar"
        [title]="filter() === 'all' ? 'No reservations yet' : 'Nothing in this list'"
        message="Book a table and it will appear here, with the status the manager sets."
        actionLabel="Book a table"
        (action)="goToBooking()"
      />
    }

    <app-confirm-dialog
      [(open)]="confirmOpen"
      title="Cancel this booking?"
      [message]="confirmMessage()"
      confirmLabel="Yes, cancel it"
      cancelLabel="Keep it"
      [danger]="true"
      (confirmed)="cancel()"
    />
  `,
})
export class AccountReservationsPage {
  private readonly auth = inject(AuthService);
  private readonly reservationService = inject(ReservationService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly filter = signal('upcoming');
  protected readonly confirmOpen = signal(false);
  private readonly pending = signal<Reservation | null>(null);

  private readonly userId = computed(() => this.auth.user()?.id ?? null);
  private readonly reload = signal(0);

  protected readonly reservations = toSignal(
    toObservable(computed(() => `${this.userId()}:${this.reload()}`)).pipe(
      switchMap(() => {
        const id = this.userId();
        return id ? this.reservationService.forCustomer(id) : of<Reservation[]>([]);
      }),
    ),
    { initialValue: [] as Reservation[] },
  );

  private readonly today = new Date().setHours(0, 0, 0, 0);

  protected readonly tabs = computed(() => {
    const all = this.reservations();
    return [
      { id: 'upcoming', label: 'Upcoming', count: all.filter((r) => this.isUpcoming(r)).length },
      { id: 'past', label: 'Past', count: all.filter((r) => !this.isUpcoming(r)).length },
      { id: 'all', label: 'All', count: all.length },
    ];
  });

  protected readonly visible = computed(() => {
    const all = [...this.reservations()].sort((a, b) => (a.date > b.date ? -1 : 1));
    if (this.filter() === 'upcoming') return all.filter((r) => this.isUpcoming(r));
    if (this.filter() === 'past') return all.filter((r) => !this.isUpcoming(r));
    return all;
  });

  protected readonly confirmMessage = computed(() => {
    const r = this.pending();
    return r
      ? `Booking ${r.reference} for ${r.guests} guests on ${new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} will be cancelled. There is no charge.`
      : '';
  });

  constructor() {
    this.seo.apply({
      title: 'My Reservations | Salateen Restaurant Swabi',
      description: 'Your table bookings at Salateen Restaurant Swabi.',
      path: 'account/reservations',
      noIndex: true,
    });
  }

  protected meta(r: Reservation) {
    return RESERVATION_STATUS_META[r.status];
  }
  protected zoneLabel(zone: string): string {
    return TABLE_ZONES.find((z) => z.value === zone)?.label ?? zone;
  }
  protected occasionLabel(occasion: string): string {
    return OCCASIONS.find((o) => o.value === occasion)?.label ?? occasion;
  }
  protected dayOf(date: string): string {
    return new Date(date).getDate().toString();
  }
  protected monthOf(date: string): string {
    return new Date(date).toLocaleDateString('en-GB', { month: 'short' });
  }

  private isUpcoming(r: Reservation): boolean {
    return (
      new Date(r.date).getTime() >= this.today &&
      ['pending', 'confirmed', 'seated'].includes(r.status)
    );
  }

  protected canCancel(r: Reservation): boolean {
    return this.isUpcoming(r) && r.status !== 'seated';
  }

  protected askCancel(r: Reservation): void {
    this.pending.set(r);
    this.confirmOpen.set(true);
  }

  protected cancel(): void {
    const r = this.pending();
    if (!r) return;
    this.reservationService.cancel(r.id).subscribe({
      next: () => {
        this.toast.success('Booking cancelled', `${r.reference} has been released.`);
        this.reload.update((n) => n + 1);
      },
      error: () =>
        this.toast.error('That did not cancel', 'Please call us on 0312-0991116 instead.'),
    });
  }

  protected goToBooking(): void {
    void this.router.navigate(['/reservation']);
  }
}
