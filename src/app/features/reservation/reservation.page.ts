import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BRAND, OCCASIONS, TABLE_ZONES } from '../../core/constants/app.constants';
import { AvailabilitySlot, TableZone } from '../../core/models/reservation.model';
import { AuthService } from '../../core/services/auth.service';
import { ReservationService } from '../../core/services/reservation.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import {
  normalisePhone,
  notPastDateValidator,
  pakPhoneValidator,
  revealErrors,
} from '../../shared/validators/form.validators';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { FieldComponent } from '../../shared/components/ui/form.components';
import { SpinnerComponent } from '../../shared/components/ui/feedback.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';

/**
 * Table booking.
 *
 * Three steps in one page rather than a wizard: choosing the room, then the
 * date and slot, then the guest details. Availability is recomputed whenever
 * the date, zone or party size changes.
 */
@Component({
  selector: 'app-reservation-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    PageHeroComponent,
    ImageComponent,
    IconComponent,
    FieldComponent,
    SpinnerComponent,
    RevealDirective,
  ],
  template: `
    <app-page-hero
      eyebrow="Reservations"
      title="Reserve a table"
      accent=" at Salateen"
      description="Booking is free, takes a minute, and we hold the table for fifteen minutes past your time. Tell us the occasion and we will set the room for it."
      image="assets/images/interior/family-hall-lit"
      imageAlt="The family hall at Salateen Restaurant Swabi"
      [crumbs]="[{ label: 'Reservation' }]"
      size="md"
    />

    <section class="section pt-14">
      <div class="container-lux">
        <div class="grid gap-10 lg:grid-cols-12">
          <!-- Form -->
          <div class="lg:col-span-8">
            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-6">
              <!-- Step 1: room -->
              <fieldset class="panel p-6" appReveal>
                <legend class="flex items-center gap-3">
                  <span
                    class="flex h-7 w-7 items-center justify-center rounded-full bg-clay-600 text-xs font-bold text-white"
                    >1</span
                  >
                  <span class="font-display text-xl text-ink-900">Choose your room</span>
                </legend>

                <div class="mt-5 grid gap-3 sm:grid-cols-2">
                  @for (zone of zones; track zone.value) {
                    <button
                      type="button"
                      class="group relative overflow-hidden rounded-xl border text-left transition-all duration-400"
                      [class]="
                        zone.comingSoon
                          ? 'cursor-not-allowed border-ink-200 opacity-55'
                          : selectedZone() === zone.value
                            ? 'border-clay-600 shadow-clay'
                            : 'border-ink-200 hover:border-clay-500/50'
                      "
                      [disabled]="zone.comingSoon"
                      [attr.aria-pressed]="selectedZone() === zone.value"
                      (click)="selectZone(zone.value)"
                    >
                      <span class="relative block aspect-[16/9] overflow-hidden">
                        <app-image
                          [src]="zone.image"
                          [alt]="zone.label"
                          sizes="(max-width: 640px) 92vw, 20rem"
                          class="h-full w-full transition-transform duration-700 group-hover:scale-105"
                        />
                        @if (selectedZone() === zone.value) {
                          <span
                            class="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-clay-600 text-white"
                          >
                            <app-icon name="check" [size]="15" [strokeWidth]="2.6" />
                          </span>
                        }
                        @if (zone.comingSoon) {
                          <span
                            class="absolute top-2.5 left-2.5 chip border-white/30 bg-scrim/60 text-white"
                            >Opening soon</span
                          >
                        }
                      </span>
                      <span class="block p-4">
                        <span class="block font-display text-lg text-ink-900">{{ zone.label }}</span>
                        <span class="mt-1 block text-xs leading-relaxed text-ink-500">{{
                          zone.description
                        }}</span>
                      </span>
                    </button>
                  }
                </div>
              </fieldset>

              <!-- Step 2: when -->
              <fieldset class="panel p-6" appReveal>
                <legend class="flex items-center gap-3">
                  <span
                    class="flex h-7 w-7 items-center justify-center rounded-full bg-clay-600 text-xs font-bold text-white"
                    >2</span
                  >
                  <span class="font-display text-xl text-ink-900">Date, time and party size</span>
                </legend>

                <div class="mt-5 grid gap-4 sm:grid-cols-2">
                  <app-field label="Date" [required]="true" [control]="form.controls.date" fieldId="date">
                    <input
                      id="date"
                      type="date"
                      class="field"
                      formControlName="date"
                      [min]="minDate"
                      [max]="maxDate"
                    />
                  </app-field>
                  <app-field
                    label="Guests"
                    [required]="true"
                    [control]="form.controls.guests"
                    fieldId="guests"
                    hint="Booking for more than 20? Call us and we will hold a hall."
                  >
                    <select id="guests" class="field" formControlName="guests">
                      @for (n of guestOptions; track n) {
                        <option [value]="n">{{ n }} {{ n === 1 ? 'guest' : 'guests' }}</option>
                      }
                    </select>
                  </app-field>
                </div>

                <div class="mt-6">
                  <p class="field-label">Available times</p>
                  @if (loadingSlots()) {
                    <div class="flex items-center gap-2 py-4 text-sm text-ink-500">
                      <app-spinner [size]="16" />
                      Checking the book
                    </div>
                  } @else if (slots().length === 0) {
                    <p class="py-4 text-sm text-ink-500">
                      Pick a date to see what is free.
                    </p>
                  } @else {
                    <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                      @for (slot of slots(); track slot.time) {
                        <button
                          type="button"
                          class="rounded-lg border py-2.5 text-xs font-semibold transition-all"
                          [class]="
                            !slot.available
                              ? 'cursor-not-allowed border-ink-200 text-ink-300 line-through'
                              : selectedTime() === slot.time
                                ? 'border-clay-600 bg-clay-600 text-white shadow-clay'
                                : 'border-ink-300 text-ink-700 hover:border-clay-500 hover:text-clay-700'
                          "
                          [disabled]="!slot.available"
                          [attr.aria-pressed]="selectedTime() === slot.time"
                          (click)="selectTime(slot.time)"
                        >
                          {{ slot.label }}
                        </button>
                      }
                    </div>
                    <p class="mt-3 text-xs text-ink-500">
                      Times shown are for the {{ zoneLabel() }}. Tables are held for 90 minutes.
                    </p>
                  }
                  @if (timeError()) {
                    <p class="field-error">
                      <app-icon name="alert" [size]="13" />
                      Choose a time to continue.
                    </p>
                  }
                </div>
              </fieldset>

              <!-- Step 3: details -->
              <fieldset class="panel p-6" appReveal>
                <legend class="flex items-center gap-3">
                  <span
                    class="flex h-7 w-7 items-center justify-center rounded-full bg-clay-600 text-xs font-bold text-white"
                    >3</span
                  >
                  <span class="font-display text-xl text-ink-900">Your details</span>
                </legend>

                <div class="mt-5 grid gap-4 sm:grid-cols-2">
                  <app-field
                    label="Full name"
                    [required]="true"
                    [control]="form.controls.customerName"
                    fieldId="rname"
                  >
                    <input id="rname" type="text" class="field" formControlName="customerName" autocomplete="name" />
                  </app-field>
                  <app-field
                    label="Mobile number"
                    [required]="true"
                    [control]="form.controls.customerPhone"
                    fieldId="rphone"
                  >
                    <input
                      id="rphone"
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
                    fieldId="remail"
                    hint="Optional. We send the confirmation here."
                  >
                    <input id="remail" type="email" class="field" formControlName="customerEmail" autocomplete="email" />
                  </app-field>
                  <app-field label="Occasion" [control]="form.controls.occasion" fieldId="occasion">
                    <select id="occasion" class="field" formControlName="occasion">
                      @for (occasion of occasions; track occasion.value) {
                        <option [value]="occasion.value">{{ occasion.label }}</option>
                      }
                    </select>
                  </app-field>
                  <app-field
                    label="Anything we should know?"
                    [control]="form.controls.note"
                    fieldId="rnote"
                    class="sm:col-span-2"
                  >
                    <textarea
                      id="rnote"
                      rows="3"
                      class="field resize-none"
                      maxlength="300"
                      placeholder="High chair needed, wheelchair access, prefer a corner table, celebrating a birthday..."
                      formControlName="note"
                    ></textarea>
                  </app-field>
                </div>

                <button type="submit" class="btn btn-primary btn-lg mt-6 w-full sm:w-auto" [disabled]="submitting()">
                  @if (submitting()) {
                    <app-spinner [size]="17" />
                    Sending your request
                  } @else {
                    Request this table
                    <app-icon name="arrow-right" [size]="16" />
                  }
                </button>
                <p class="mt-3 text-xs text-ink-500">
                  Requests are confirmed by the manager, usually within an hour during opening
                  hours. There is no charge and no card required.
                </p>
              </fieldset>
            </form>
          </div>

          <!-- Summary rail -->
          <aside class="lg:col-span-4">
            <div class="panel sticky top-[calc(var(--header-h)+1.5rem)] p-6">
              <p class="eyebrow mb-4">Your booking</p>
              <dl class="space-y-3.5 text-sm">
                <div class="flex items-start gap-3">
                  <app-icon name="table" [size]="16" class="mt-0.5 shrink-0 text-clay-600" />
                  <div>
                    <dt class="text-xs text-ink-500">Room</dt>
                    <dd class="font-semibold text-ink-900">{{ zoneLabel() }}</dd>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <app-icon name="calendar" [size]="16" class="mt-0.5 shrink-0 text-clay-600" />
                  <div>
                    <dt class="text-xs text-ink-500">Date</dt>
                    <dd class="font-semibold text-ink-900">{{ prettyDate() }}</dd>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <app-icon name="clock" [size]="16" class="mt-0.5 shrink-0 text-clay-600" />
                  <div>
                    <dt class="text-xs text-ink-500">Time</dt>
                    <dd class="font-semibold text-ink-900">
                      {{ selectedTime() ? prettyTime() : 'Not chosen yet' }}
                    </dd>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <app-icon name="users" [size]="16" class="mt-0.5 shrink-0 text-clay-600" />
                  <div>
                    <dt class="text-xs text-ink-500">Party</dt>
                    <dd class="font-semibold text-ink-900">{{ guests() }} guests</dd>
                  </div>
                </div>
              </dl>

              <div class="mt-6 space-y-2.5 border-t border-ink-200 pt-5">
                @for (note of assurances; track note) {
                  <p class="flex items-start gap-2 text-xs text-ink-500">
                    <app-icon name="check" [size]="13" class="mt-0.5 shrink-0 text-clay-600" [strokeWidth]="2.4" />
                    {{ note }}
                  </p>
                }
              </div>

              <div class="mt-6 rounded-xl border border-clay-600/25 bg-clay-50 p-4">
                <p class="text-xs font-semibold text-clay-700">Booking for more than 20?</p>
                <p class="mt-1.5 text-xs leading-relaxed text-ink-600">
                  Call us and we will hold the whole family hall, which takes up to forty.
                </p>
                <a [href]="'tel:' + brand.phone" class="btn btn-secondary btn-sm mt-3 w-full">
                  <app-icon name="phone" [size]="13" />
                  {{ brand.phoneDisplay }}
                </a>
              </div>

              <a routerLink="/faq" class="mt-4 block text-center text-xs text-ink-500 hover:text-clay-700">
                Reservation questions
              </a>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `,
})
export class ReservationPage {
  private readonly reservations = inject(ReservationService);
  private readonly restaurant = inject(RestaurantService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);

  protected readonly brand = BRAND;
  protected readonly zones = TABLE_ZONES;
  protected readonly occasions = OCCASIONS;
  protected readonly guestOptions = Array.from({ length: 20 }, (_, i) => i + 1);
  protected readonly assurances = [
    'Free to book, no deposit, no card',
    'Cancel any time from your account or by phone',
    'Table held for 15 minutes past your time',
  ];

  protected readonly minDate = new Date().toISOString().slice(0, 10);
  protected readonly maxDate = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);

  protected readonly selectedZone = signal<TableZone>('indoor');
  protected readonly selectedTime = signal<string | null>(null);
  protected readonly slots = signal<AvailabilitySlot[]>([]);
  protected readonly loadingSlots = signal(false);
  protected readonly submitting = signal(false);
  protected readonly timeError = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    date: [this.minDate, [Validators.required, notPastDateValidator()]],
    guests: [4, [Validators.required, Validators.min(1), Validators.max(20)]],
    customerName: ['', [Validators.required, Validators.minLength(3)]],
    customerPhone: ['', [Validators.required, pakPhoneValidator()]],
    customerEmail: ['', [Validators.email]],
    occasion: [''],
    note: [''],
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly guests = computed(() => Number(this.formValue()?.guests ?? 4));
  protected readonly date = computed(() => String(this.formValue()?.date ?? this.minDate));

  protected readonly zoneLabel = computed(
    () => TABLE_ZONES.find((z) => z.value === this.selectedZone())?.label ?? 'Indoor Hall',
  );

  protected readonly prettyDate = computed(() => {
    const value = this.date();
    if (!value) return 'Not chosen yet';
    return new Date(value).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  });

  protected readonly prettyTime = computed(
    () => this.slots().find((s) => s.time === this.selectedTime())?.label ?? '',
  );

  constructor() {
    this.seo.apply({
      title: 'Book a Table | Salateen Restaurant Swabi',
      description:
        'Reserve a table at Salateen Restaurant Swabi. Indoor hall, family hall with full purdah, or the outdoor lawn beside the grill pits. Free booking, no deposit.',
      path: 'reservation',
      image: 'assets/images/interior/family-hall-lit.webp',
      keywords: [
        'book a table Swabi',
        'Salateen reservation',
        'family hall Swabi',
        'restaurant booking Khyber Pakhtunkhwa',
      ],
    });
    this.seo.breadcrumbSchema([{ label: 'Reservation', path: 'reservation' }]);

    // Deep link from the home page zone tiles.
    const zoneParam = this.route.snapshot.queryParamMap.get('zone') as TableZone | null;
    if (zoneParam && TABLE_ZONES.some((z) => z.value === zoneParam && !z.comingSoon)) {
      this.selectedZone.set(zoneParam);
    }

    effect(() => {
      const user = this.auth.user();
      if (!user) return;
      this.form.patchValue(
        { customerName: user.name, customerPhone: user.phone, customerEmail: user.email },
        { emitEvent: false },
      );
    });

    // Recheck availability whenever the three inputs that affect it change.
    effect(() => {
      const date = this.date();
      const zone = this.selectedZone();
      const guests = this.guests();
      if (!date) return;

      this.loadingSlots.set(true);
      this.reservations.availability(date, zone, guests).subscribe({
        next: (slots) => {
          this.slots.set(slots);
          this.loadingSlots.set(false);
          // Drop a previously chosen time if it is no longer bookable.
          const current = this.selectedTime();
          if (current && !slots.find((s) => s.time === current && s.available)) {
            this.selectedTime.set(null);
          }
        },
        error: () => this.loadingSlots.set(false),
      });
    });
  }

  protected selectZone(zone: TableZone): void {
    this.selectedZone.set(zone);
  }

  protected selectTime(time: string): void {
    this.selectedTime.set(time);
    this.timeError.set(false);
  }

  protected submit(): void {
    this.timeError.set(!this.selectedTime());

    if (this.form.invalid || !this.selectedTime()) {
      revealErrors(this.form);
      this.toast.error('Almost there', 'Check the highlighted fields and pick a time.');
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();

    this.reservations
      .create({
        customerId: this.auth.user()?.id ?? null,
        customerName: value.customerName.trim(),
        customerPhone: normalisePhone(value.customerPhone),
        customerEmail: value.customerEmail.trim() || undefined,
        date: value.date,
        time: this.selectedTime()!,
        guests: Number(value.guests),
        zone: this.selectedZone(),
        occasion: value.occasion || undefined,
        note: value.note.trim() || undefined,
      })
      .subscribe({
        next: (reservation) => {
          this.submitting.set(false);
          this.toast.success(
            'Request sent',
            `Reference ${reservation.reference}. We will confirm shortly.`,
          );
          void this.router.navigate(['/reservation/confirmation', reservation.id]);
        },
        error: () => {
          this.submitting.set(false);
          this.toast.error(
            'We could not send that request',
            'Please try again, or call us on 0312-0991116.',
          );
        },
      });
  }
}
