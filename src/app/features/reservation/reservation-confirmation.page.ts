import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { BRAND, OCCASIONS, RESERVATION_STATUS_META, TABLE_ZONES } from '../../core/constants/app.constants';
import { Reservation } from '../../core/models/reservation.model';
import { ReservationService } from '../../core/services/reservation.service';
import { SeoService } from '../../core/services/seo.service';
import { Clock12Pipe, NiceDatePipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';

@Component({
  selector: 'app-reservation-confirmation-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    ImageComponent,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonComponent,
    Clock12Pipe,
    NiceDatePipe,
  ],
  template: `
    <div class="pt-[calc(var(--header-h)+3rem)] pb-24">
      <div class="container-lux max-w-3xl">
        @if (reservation(); as r) {
          <div class="text-center">
            <span
              class="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-clay-600/25 bg-clay-50 text-clay-700"
              style="animation: fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both"
            >
              <app-icon name="calendar" [size]="34" />
            </span>
            <p class="eyebrow mt-6">Request received</p>
            <h1 class="mt-3 text-4xl leading-tight sm:text-5xl">
              We have your table
              <span class="text-gradient-clay italic">request</span>
            </h1>
            <p class="mx-auto mt-4 max-w-lg leading-relaxed text-ink-600">
              The manager confirms bookings personally, usually within an hour during opening hours.
              You will get a call on {{ r.customerPhone }}.
            </p>
          </div>

          <!-- Card -->
          <div class="panel mt-9 overflow-hidden">
            <div class="relative aspect-[21/9]">
              <app-image
                [src]="zoneImage()"
                [alt]="zoneLabel()"
                sizes="(max-width: 768px) 94vw, 48rem"
                class="h-full w-full"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-scrim/85 to-transparent"></div>
              <div class="on-photo absolute inset-x-6 bottom-5 flex items-end justify-between gap-4">
                <div>
                  <p class="eyebrow">{{ zoneLabel() }}</p>
                  <p class="mt-1 font-display text-3xl text-white">{{ r.reference }}</p>
                </div>
                <app-badge [tone]="$any(statusTone())" [dot]="true">{{ statusLabel() }}</app-badge>
              </div>
            </div>

            <dl class="grid gap-px bg-ink-200 sm:grid-cols-2">
              <div class="bg-white p-5">
                <dt class="flex items-center gap-2 text-xs text-ink-500">
                  <app-icon name="calendar" [size]="14" class="text-clay-600" />
                  Date
                </dt>
                <dd class="mt-1.5 font-display text-xl text-ink-900">{{ r.date | niceDate }}</dd>
                <dd class="text-xs text-ink-500">{{ weekday() }}</dd>
              </div>
              <div class="bg-white p-5">
                <dt class="flex items-center gap-2 text-xs text-ink-500">
                  <app-icon name="clock" [size]="14" class="text-clay-600" />
                  Time
                </dt>
                <dd class="mt-1.5 font-display text-xl text-ink-900">{{ r.time | clock12 }}</dd>
                <dd class="text-xs text-ink-500">Held for {{ r.durationMinutes }} minutes</dd>
              </div>
              <div class="bg-white p-5">
                <dt class="flex items-center gap-2 text-xs text-ink-500">
                  <app-icon name="users" [size]="14" class="text-clay-600" />
                  Party size
                </dt>
                <dd class="mt-1.5 font-display text-xl text-ink-900">{{ r.guests }} guests</dd>
                @if (r.tableCode) {
                  <dd class="text-xs text-ink-500">Table {{ r.tableCode }}</dd>
                }
              </div>
              <div class="bg-white p-5">
                <dt class="flex items-center gap-2 text-xs text-ink-500">
                  <app-icon name="user" [size]="14" class="text-clay-600" />
                  Booked by
                </dt>
                <dd class="mt-1.5 font-display text-xl text-ink-900">{{ r.customerName }}</dd>
                <dd class="text-xs text-ink-500">{{ r.customerPhone }}</dd>
              </div>
            </dl>

            @if (r.occasion || r.note) {
              <div class="border-t border-ink-200 p-5">
                @if (r.occasion) {
                  <p class="text-sm">
                    <span class="text-ink-500">Occasion:</span>
                    <span class="ml-1.5 font-semibold text-ink-900">{{ occasionLabel() }}</span>
                  </p>
                }
                @if (r.note) {
                  <p class="mt-2 text-sm leading-relaxed text-ink-600">
                    <span class="text-ink-500">Your note:</span> {{ r.note }}
                  </p>
                }
              </div>
            }
          </div>

          <!-- What happens next -->
          <div class="panel mt-6 p-6">
            <p class="eyebrow mb-4">What happens next</p>
            <ol class="space-y-3.5">
              @for (step of nextSteps; track step.title; let i = $index) {
                <li class="flex gap-3.5">
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay-50 text-xs font-bold text-clay-700"
                    >{{ i + 1 }}</span
                  >
                  <span>
                    <span class="block text-sm font-semibold text-ink-900">{{ step.title }}</span>
                    <span class="mt-0.5 block text-xs leading-relaxed text-ink-500">{{ step.body }}</span>
                  </span>
                </li>
              }
            </ol>
          </div>

          <div class="mt-8 flex flex-wrap justify-center gap-3">
            <a [href]="'tel:' + brand.phone" class="btn btn-primary btn-md">
              <app-icon name="phone" [size]="15" />
              {{ brand.phoneDisplay }}
            </a>
            <a routerLink="/menu" class="btn btn-secondary btn-md">Look at the menu</a>
            <a routerLink="/account/reservations" class="btn btn-ghost btn-md border border-ink-300"
              >My reservations</a
            >
          </div>
        } @else {
          <div class="space-y-4">
            <app-skeleton height="5rem" width="5rem" rounded="rounded-full" />
            <app-skeleton height="3rem" width="60%" />
            <app-skeleton height="22rem" />
          </div>
          <app-empty-state
            class="mt-4"
            icon="calendar"
            title="Looking for that reservation"
            message="If this does not load, check the link or call us and we will find it."
          />
        }
      </div>
    </div>
  `,
})
export class ReservationConfirmationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly reservations = inject(ReservationService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;
  protected readonly nextSteps = [
    {
      title: 'The manager reviews it',
      body: 'We check the book for that room and time. Confirmation usually comes within the hour.',
    },
    {
      title: 'We call you',
      body: 'A quick call to confirm and to ask anything we need for the occasion.',
    },
    {
      title: 'Arrive and mention the reference',
      body: 'Give the reference at the counter. We hold the table for fifteen minutes past your time.',
    },
  ];

  protected readonly reservation = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (!id) return of(null);
        return this.reservations.byId(id).pipe(catchError(() => of(null)));
      }),
    ),
    { initialValue: null as Reservation | null },
  );

  protected readonly zoneMeta = computed(() =>
    TABLE_ZONES.find((z) => z.value === this.reservation()?.zone),
  );
  protected readonly zoneLabel = computed(() => this.zoneMeta()?.label ?? 'Indoor Hall');
  protected readonly zoneImage = computed(
    () => this.zoneMeta()?.image ?? 'assets/images/interior/main-dining-hall',
  );

  protected readonly statusLabel = computed(() => {
    const status = this.reservation()?.status;
    return status ? RESERVATION_STATUS_META[status].label : '';
  });
  protected readonly statusTone = computed(() => {
    const status = this.reservation()?.status;
    return status ? RESERVATION_STATUS_META[status].tone : 'ink';
  });

  protected readonly occasionLabel = computed(
    () => OCCASIONS.find((o) => o.value === this.reservation()?.occasion)?.label ?? '',
  );

  protected readonly weekday = computed(() => {
    const date = this.reservation()?.date;
    return date ? new Date(date).toLocaleDateString('en-GB', { weekday: 'long' }) : '';
  });

  constructor() {
    this.seo.apply({
      title: 'Reservation Requested | Salateen Restaurant Swabi',
      description: 'Your table request at Salateen Restaurant Swabi has been received.',
      path: 'reservation/confirmation',
      noIndex: true,
    });
  }
}
