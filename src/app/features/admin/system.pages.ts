import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { DAY_NAMES } from '../../core/constants/app.constants';
import { AppNotification, SystemLogEntry } from '../../core/models/content.model';
import { AppSettings, OpeningHour } from '../../core/models/restaurant.model';
import { AuthService } from '../../core/services/auth.service';
import { ContentService } from '../../core/services/content.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { revealErrors } from '../../shared/validators/form.validators';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { FieldComponent } from '../../shared/components/ui/form.components';
import {
  EmptyStateComponent,
  SkeletonComponent,
  SpinnerComponent,
} from '../../shared/components/ui/feedback.components';
import { AdminHeaderComponent, StatusPillComponent } from './shared/admin-ui.components';
import { ResourceColumn, ResourcePageComponent } from './shared/resource-page.component';

const dateTime = (iso: string | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--';

/* ---------------------------------------------------------- notifications -- */

@Component({
  selector: 'app-admin-notifications-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, EmptyStateComponent, AdminHeaderComponent, TimeAgoPipe],
  template: `
    <app-admin-header
      eyebrow="System"
      title="Notifications"
      description="Orders, bookings, stock alerts and reviews, newest first."
    >
      @if (unread() > 0) {
        <button type="button" class="btn btn-secondary btn-md" (click)="markAllRead()">
          <app-icon name="check" [size]="15" [strokeWidth]="2.4" />
          Mark all read ({{ unread() }})
        </button>
      }
    </app-admin-header>

    @if (rows().length) {
      <ul class="mt-7 space-y-2.5">
        @for (item of rows(); track item.id) {
          <li>
            <article
              class="panel flex items-start gap-4 p-5"
              [class]="item.isRead ? '' : 'border-clay-600/30 bg-clay-50/50'"
            >
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                [class]="tone(item.severity)"
              >
                <app-icon [name]="$any(icon(item.kind))" [size]="17" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-ink-900">{{ item.title }}</p>
                <p class="mt-1 text-sm leading-relaxed text-ink-600">{{ item.body }}</p>
                <p class="mt-2 text-caption text-ink-400">{{ item.createdAt | timeAgo }}</p>
              </div>
              @if (!item.isRead) {
                <button
                  type="button"
                  class="shrink-0 text-caption font-semibold text-clay-700 hover:underline"
                  (click)="markRead(item)"
                >
                  Mark read
                </button>
              }
            </article>
          </li>
        }
      </ul>
    } @else {
      <app-empty-state class="mt-7" icon="bell" title="Nothing to report" message="You are up to date." />
    }
  `,
})
export class AdminNotificationsPage {
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.content.notifications())),
    { initialValue: [] as AppNotification[] },
  );
  protected readonly unread = computed(() => this.rows().filter((n) => !n.isRead).length);

  constructor() {
    this.seo.apply({
      title: 'Notifications | Salateen Admin',
      description: '',
      path: 'admin/notifications',
      noIndex: true,
    });
  }

  protected icon(kind: string): string {
    return (
      { order: 'bag', reservation: 'calendar', inventory: 'box', review: 'star', system: 'settings', promotion: 'tag' }[
        kind
      ] ?? 'bell'
    );
  }

  protected tone(severity: string): string {
    return (
      {
        info: 'border-basil-600/25 bg-basil-50 text-basil-700',
        success: 'border-emerald-600/25 bg-emerald-50 text-emerald-700',
        warning: 'border-amber-500/30 bg-amber-50 text-amber-700',
        danger: 'border-red-500/25 bg-red-50 text-red-700',
      }[severity] ?? 'border-ink-200 bg-ink-100 text-ink-600'
    );
  }

  protected markRead(item: AppNotification): void {
    this.content.markNotificationRead(item.id).subscribe(() => this.reload.update((n) => n + 1));
  }

  protected markAllRead(): void {
    const unread = this.rows().filter((n) => !n.isRead);
    let done = 0;
    for (const item of unread) {
      this.content.markNotificationRead(item.id).subscribe({
        next: () => {
          if (++done === unread.length) {
            this.reload.update((n) => n + 1);
            this.toast.success('All caught up');
          }
        },
        error: () => this.reload.update((n) => n + 1),
      });
    }
  }
}

/* ------------------------------------------------------------ system logs -- */

@Component({
  selector: 'app-admin-logs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="System"
      title="System logs"
      description="Who did what, and from where. Retained for thirty days in this demo."
      singular="entry"
      searchPlaceholder="Search by actor, action or target"
      emptyIcon="terminal"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [searchable]="searchable"
      [perPage]="30"
    />
  `,
})
export class AdminLogsPage {
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);

  protected readonly rows = toSignal(this.content.systemLogs(), {
    initialValue: [] as SystemLogEntry[],
  });
  protected readonly loading = computed(() => this.rows().length === 0);

  protected readonly columns: ResourceColumn<SystemLogEntry>[] = [
    { header: 'When', kind: 'date', value: (r) => dateTime(r.createdAt) },
    {
      header: 'Level',
      kind: 'status',
      value: (r) => r.level,
      tone: (r) => ({ info: 'basil', warning: 'amber', error: 'red' })[r.level] ?? 'ink',
    },
    { header: 'Actor', kind: 'strong', value: (r) => r.actor },
    { header: 'Action', kind: 'muted', value: (r) => r.action },
    { header: 'Target', kind: 'muted', value: (r) => r.target, hideBelow: 'md' },
    { header: 'IP', kind: 'muted', value: (r) => r.ip, hideBelow: 'lg' },
  ];

  protected readonly searchable = (r: SystemLogEntry) => `${r.actor} ${r.action} ${r.target} ${r.ip}`;

  constructor() {
    this.seo.apply({ title: 'System Logs | Salateen Admin', description: '', path: 'admin/logs', noIndex: true });
  }
}

/* ----------------------------------------------------------- working hours -- */

@Component({
  selector: 'app-working-hours-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent, SkeletonComponent, AdminHeaderComponent, StatusPillComponent],
  template: `
    <app-admin-header
      eyebrow="System"
      title="Working hours"
      description="These drive the open/closed badge across the site and the hours in the structured data Google reads."
    >
      <button type="button" class="btn btn-primary btn-md" [disabled]="saving()" (click)="save()">
        <app-icon name="check" [size]="15" [strokeWidth]="2.2" />
        Save hours
      </button>
    </app-admin-header>

    @if (!hours().length) {
      <app-skeleton class="mt-7" height="20rem" rounded="rounded-2xl" />
    } @else {
      <div class="panel mt-7 overflow-hidden">
        <div class="flex items-center justify-between border-b border-ink-200 px-6 py-4">
          <p class="text-sm font-semibold text-ink-900">Weekly schedule</p>
          <app-status-pill [tone]="status().isOpen ? 'emerald' : 'amber'">{{
            status().label
          }}</app-status-pill>
        </div>

        <ul class="divide-y divide-ink-200">
          @for (hour of draft(); track hour.day) {
            <li class="flex flex-wrap items-center gap-4 px-6 py-4">
              <span
                class="w-28 shrink-0 font-medium"
                [class]="hour.day === today ? 'text-clay-700' : 'text-ink-900'"
                >{{ dayNames[hour.day] }}</span
              >

              <label class="flex cursor-pointer items-center gap-2 text-sm text-ink-600">
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-[var(--color-clay-600)]"
                  [checked]="!hour.isClosed"
                  [attr.aria-label]="'Open on ' + dayNames[hour.day]"
                  (change)="setOpen(hour.day, $any($event.target).checked)"
                />
                Open
              </label>

              @if (!hour.isClosed) {
                <div class="flex items-center gap-2">
                  <label class="sr-only" [attr.for]="'open-' + hour.day">Opens</label>
                  <input
                    [id]="'open-' + hour.day"
                    type="time"
                    class="field h-10 w-32 py-0"
                    [value]="hour.opensAt"
                    (input)="setTime(hour.day, 'opensAt', $any($event.target).value)"
                  />
                  <span class="text-ink-400">to</span>
                  <label class="sr-only" [attr.for]="'close-' + hour.day">Closes</label>
                  <input
                    [id]="'close-' + hour.day"
                    type="time"
                    class="field h-10 w-32 py-0"
                    [value]="hour.closesAt"
                    (input)="setTime(hour.day, 'closesAt', $any($event.target).value)"
                  />
                </div>
                @if (hour.closesNextDay) {
                  <span class="text-caption text-ink-500">closes after midnight</span>
                }
              } @else {
                <span class="text-sm text-ink-400">Closed all day</span>
              }
            </li>
          }
        </ul>
      </div>

      <div class="panel mt-6 p-6">
        <p class="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <app-icon name="info" [size]="16" class="text-clay-600" />
          A note on closing at midnight
        </p>
        <p class="mt-2 text-sm leading-relaxed text-ink-600">
          A closing time of 00:00 is treated as the end of that day, not the start of it. The site
          correctly shows the restaurant as open at 11pm and closed at 1am, and the structured data
          emits 23:59 so search engines read it the same way.
        </p>
      </div>
    }
  `,
})
export class WorkingHoursPage {
  private readonly restaurant = inject(RestaurantService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly dayNames = DAY_NAMES;
  protected readonly today = new Date().getDay();
  protected readonly saving = signal(false);
  protected readonly status = this.restaurant.status;
  protected readonly hours = this.restaurant.hours;
  protected readonly draft = signal<OpeningHour[]>([]);

  constructor() {
    this.seo.apply({
      title: 'Working Hours | Salateen Admin',
      description: '',
      path: 'admin/working-hours',
      noIndex: true,
    });

    effect(() => {
      const hours = this.hours();
      if (hours.length && !this.draft().length) {
        this.draft.set(hours.map((h) => ({ ...h })));
      }
    });
  }

  protected setOpen(day: number, isOpen: boolean): void {
    this.draft.update((hours) =>
      hours.map((h) => (h.day === day ? { ...h, isClosed: !isOpen } : h)),
    );
  }

  protected setTime(day: number, key: 'opensAt' | 'closesAt', value: string): void {
    this.draft.update((hours) =>
      hours.map((h) =>
        h.day === day
          ? { ...h, [key]: value, closesNextDay: key === 'closesAt' ? value <= h.opensAt : h.closesNextDay }
          : h,
      ),
    );
  }

  protected save(): void {
    this.saving.set(true);
    this.restaurant.update({ openingHours: this.draft() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Hours saved', 'The site badge and structured data update immediately.');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('That did not save');
      },
    });
  }
}

/* ---------------------------------------------------- restaurant settings -- */

@Component({
  selector: 'app-admin-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, FieldComponent, SpinnerComponent, AdminHeaderComponent],
  template: `
    <app-admin-header
      eyebrow="System"
      title="Restaurant settings"
      description="Ordering rules, delivery thresholds and the site-wide announcement."
    />

    <form [formGroup]="form" (ngSubmit)="save()" class="mt-7 space-y-6">
      <fieldset class="panel p-6">
        <legend class="font-display text-xl">Ordering</legend>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <app-field label="Default delivery fee (Rs)" [control]="form.controls.defaultDeliveryFee" fieldId="fee">
            <input id="fee" type="number" class="field" formControlName="defaultDeliveryFee" />
          </app-field>
          <app-field
            label="Free delivery above (Rs)"
            [control]="form.controls.freeDeliveryThreshold"
            fieldId="free"
          >
            <input id="free" type="number" class="field" formControlName="freeDeliveryThreshold" />
          </app-field>
          <app-field label="Minimum order (Rs)" [control]="form.controls.minimumOrderValue" fieldId="min">
            <input id="min" type="number" class="field" formControlName="minimumOrderValue" />
          </app-field>
          <app-field
            label="Average prep minutes"
            [control]="form.controls.averagePrepMinutes"
            fieldId="prep"
            hint="Used for the checkout estimate."
          >
            <input id="prep" type="number" class="field" formControlName="averagePrepMinutes" />
          </app-field>
        </div>
      </fieldset>

      <fieldset class="panel p-6">
        <legend class="font-display text-xl">Reservations</legend>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <app-field
            label="Maximum guests per booking"
            [control]="form.controls.maxGuestsPerReservation"
            fieldId="maxg"
          >
            <input id="maxg" type="number" class="field" formControlName="maxGuestsPerReservation" />
          </app-field>
          <app-field label="Slot length (minutes)" [control]="form.controls.reservationSlotMinutes" fieldId="slot">
            <input id="slot" type="number" class="field" formControlName="reservationSlotMinutes" />
          </app-field>
          <app-field label="Minimum notice (hours)" [control]="form.controls.reservationLeadHours" fieldId="lead">
            <input id="lead" type="number" class="field" formControlName="reservationLeadHours" />
          </app-field>
          <app-field
            label="Book up to (days ahead)"
            [control]="form.controls.reservationMaxDaysAhead"
            fieldId="ahead"
          >
            <input id="ahead" type="number" class="field" formControlName="reservationMaxDaysAhead" />
          </app-field>
        </div>
      </fieldset>

      <fieldset class="panel p-6">
        <legend class="font-display text-xl">Site</legend>
        <div class="mt-5 space-y-4">
          <app-field
            label="Announcement bar"
            [control]="form.controls.announcement"
            fieldId="announce"
            hint="Shown across the top of every public page. Leave blank to hide it."
          >
            <input id="announce" type="text" class="field" formControlName="announcement" />
          </app-field>

          <div class="grid gap-3 sm:grid-cols-3">
            @for (toggle of toggles; track toggle.key) {
              <label
                class="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-4 transition-colors hover:border-clay-500/35"
              >
                <input
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-clay-600)]"
                  [formControlName]="toggle.key"
                />
                <span>
                  <span class="block text-sm font-semibold text-ink-900">{{ toggle.label }}</span>
                  <span class="mt-0.5 block text-caption text-ink-500">{{ toggle.hint }}</span>
                </span>
              </label>
            }
          </div>
        </div>
      </fieldset>

      <div class="rounded-2xl border border-amber-500/35 bg-amber-50 p-6">
        <p class="flex items-center gap-2 font-semibold text-amber-800">
          <app-icon name="lock" [size]="17" />
          Online payment is disabled by design
        </p>
        <p class="mt-2 text-sm leading-relaxed text-ink-700">
          Salateen takes cash only, so there is no payment gateway in this build and no setting to
          enable one. When the client is ready, BACKEND_PLAN.md documents exactly where a gateway
          would be wired into the Laravel order lifecycle.
        </p>
      </div>

      <button type="submit" class="btn btn-primary btn-lg" [disabled]="saving()">
        @if (saving()) {
          <app-spinner [size]="16" />
          Saving
        } @else {
          Save settings
        }
      </button>
    </form>
  `,
})
export class AdminSettingsPage {
  private readonly restaurant = inject(RestaurantService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);

  protected readonly toggles = [
    { key: 'orderingEnabled' as const, label: 'Online ordering', hint: 'Turn off to pause all orders.' },
    { key: 'reservationsEnabled' as const, label: 'Reservations', hint: 'Turn off to stop new bookings.' },
    { key: 'maintenanceMode' as const, label: 'Maintenance mode', hint: 'Shows a notice on the site.' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    defaultDeliveryFee: [120, [Validators.required, Validators.min(0)]],
    freeDeliveryThreshold: [2500, [Validators.required, Validators.min(0)]],
    minimumOrderValue: [400, [Validators.required, Validators.min(0)]],
    averagePrepMinutes: [32, [Validators.required, Validators.min(5)]],
    maxGuestsPerReservation: [60, [Validators.required, Validators.min(1)]],
    reservationSlotMinutes: [30, [Validators.required, Validators.min(15)]],
    reservationLeadHours: [2, [Validators.required, Validators.min(0)]],
    reservationMaxDaysAhead: [60, [Validators.required, Validators.min(1)]],
    announcement: [''],
    orderingEnabled: [true],
    reservationsEnabled: [true],
    maintenanceMode: [false],
  });

  constructor() {
    this.seo.apply({
      title: 'Restaurant Settings | Salateen Admin',
      description: '',
      path: 'admin/settings',
      noIndex: true,
    });

    effect(() => {
      const settings = this.restaurant.settings();
      if (!settings) return;
      this.form.patchValue(
        {
          defaultDeliveryFee: settings.defaultDeliveryFee,
          freeDeliveryThreshold: settings.freeDeliveryThreshold,
          minimumOrderValue: settings.minimumOrderValue,
          averagePrepMinutes: settings.averagePrepMinutes,
          maxGuestsPerReservation: settings.maxGuestsPerReservation,
          reservationSlotMinutes: settings.reservationSlotMinutes,
          reservationLeadHours: settings.reservationLeadHours,
          reservationMaxDaysAhead: settings.reservationMaxDaysAhead,
          announcement: settings.announcement ?? '',
          orderingEnabled: settings.orderingEnabled,
          reservationsEnabled: settings.reservationsEnabled,
          maintenanceMode: settings.maintenanceMode,
        },
        { emitEvent: false },
      );
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      revealErrors(this.form);
      this.toast.error('Check the form', 'Some values are missing or out of range.');
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    this.restaurant
      .updateSettings({
        ...value,
        announcement: value.announcement.trim() || null,
      } as Partial<AppSettings>)
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Settings saved');
        },
        error: () => {
          this.saving.set(false);
          this.toast.error('That did not save');
        },
      });
  }
}

/* -------------------------------------------------------------- my profile -- */

@Component({
  selector: 'app-admin-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, FieldComponent, SpinnerComponent, AdminHeaderComponent],
  template: `
    <app-admin-header eyebrow="Account" title="My profile" description="Your details and password." />

    <div class="mt-7 grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-1">
        <div class="panel p-6 text-center">
          <span
            class="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-clay-600/25 bg-clay-50 font-display text-2xl text-clay-700"
            >{{ auth.initials() }}</span
          >
          <p class="mt-4 font-display text-xl">{{ auth.user()?.name }}</p>
          <p class="mt-1 text-caption text-ink-500">{{ auth.user()?.email }}</p>
          <p
            class="mt-3 inline-flex rounded-full border border-clay-600/30 bg-clay-50 px-3 py-1 text-micro font-bold text-clay-700 uppercase"
          >
            {{ auth.user()?.roleSlug }}
          </p>

          <dl class="mt-6 space-y-2 border-t border-ink-200 pt-5 text-left text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-ink-500">Permissions</dt>
              <dd class="font-medium text-ink-900">{{ permissionCount() }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-ink-500">Phone</dt>
              <dd class="font-medium text-ink-900">{{ auth.user()?.phone }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div class="space-y-6 lg:col-span-2">
        <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="panel p-6">
          <h2 class="font-display text-xl">Your details</h2>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <app-field label="Full name" [control]="profileForm.controls.name" fieldId="p-name">
              <input id="p-name" type="text" class="field" formControlName="name" />
            </app-field>
            <app-field label="Phone" [control]="profileForm.controls.phone" fieldId="p-phone">
              <input id="p-phone" type="tel" class="field" formControlName="phone" />
            </app-field>
            <app-field
              label="Email"
              [control]="profileForm.controls.email"
              fieldId="p-email"
              class="sm:col-span-2"
            >
              <input id="p-email" type="email" class="field" formControlName="email" />
            </app-field>
          </div>
          <button type="submit" class="btn btn-primary btn-md mt-6" [disabled]="savingProfile()">
            @if (savingProfile()) {
              <app-spinner [size]="15" />
              Saving
            } @else {
              Save changes
            }
          </button>
        </form>

        <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="panel p-6">
          <h2 class="font-display text-xl">Change password</h2>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <app-field
              label="Current password"
              [control]="passwordForm.controls.current"
              fieldId="p-cur"
              class="sm:col-span-2"
            >
              <input id="p-cur" type="password" class="field" formControlName="current" />
            </app-field>
            <app-field label="New password" [control]="passwordForm.controls.next" fieldId="p-new">
              <input id="p-new" type="password" class="field" formControlName="next" />
            </app-field>
            <app-field label="Confirm" [control]="passwordForm.controls.confirm" fieldId="p-conf">
              <input id="p-conf" type="password" class="field" formControlName="confirm" />
            </app-field>
          </div>
          @if (passwordError()) {
            <p class="field-error" role="alert">
              <app-icon name="alert" [size]="13" />
              {{ passwordError() }}
            </p>
          }
          <button type="submit" class="btn btn-primary btn-md mt-6" [disabled]="savingPassword()">
            @if (savingPassword()) {
              <app-spinner [size]="15" />
              Updating
            } @else {
              Update password
            }
          </button>
        </form>
      </div>
    </div>
  `,
})
export class AdminProfilePage {
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);

  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal('');

  protected readonly permissionCount = computed(() => {
    const permissions = this.auth.user()?.permissions ?? [];
    return permissions.includes('*') ? 'All' : permissions.length;
  });

  protected readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    current: ['', [Validators.required]],
    next: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
  });

  constructor() {
    this.seo.apply({ title: 'My Profile | Salateen Admin', description: '', path: 'admin/profile', noIndex: true });

    effect(() => {
      const user = this.auth.user();
      if (!user) return;
      this.profileForm.patchValue(
        { name: user.name, phone: user.phone, email: user.email },
        { emitEvent: false },
      );
    });
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      revealErrors(this.profileForm);
      return;
    }
    this.savingProfile.set(true);
    this.auth.updateProfile(this.profileForm.getRawValue()).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.toast.success('Profile saved');
      },
      error: () => {
        this.savingProfile.set(false);
        this.toast.error('That did not save');
      },
    });
  }

  protected changePassword(): void {
    this.passwordError.set('');
    const { current, next, confirm } = this.passwordForm.getRawValue();
    if (this.passwordForm.invalid) {
      revealErrors(this.passwordForm);
      return;
    }
    if (next !== confirm) {
      this.passwordError.set('The two passwords do not match.');
      return;
    }
    this.savingPassword.set(true);
    this.auth.changePassword(current, next).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.toast.success('Password updated');
      },
      error: (err: unknown) => {
        this.savingPassword.set(false);
        this.passwordError.set(
          err instanceof Error ? err.message : 'We could not update your password.',
        );
      },
    });
  }
}
