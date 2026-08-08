import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import {
  matchFieldsValidator,
  normalisePhone,
  pakPhoneValidator,
  revealErrors,
} from '../../shared/validators/form.validators';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { FieldComponent } from '../../shared/components/ui/form.components';
import { SpinnerComponent } from '../../shared/components/ui/feedback.components';
import { ConfirmDialogComponent } from '../../shared/components/ui/overlay.components';

@Component({
  selector: 'app-account-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IconComponent,
    FieldComponent,
    SpinnerComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <h2 class="font-display text-2xl">Settings</h2>
    <p class="mt-1.5 text-sm text-ink-600">Your details, password and what we are allowed to send you.</p>

    <!-- Profile -->
    <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="panel mt-7 p-6">
      <h3 class="font-display text-xl">Your details</h3>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <app-field label="Full name" [required]="true" [control]="profileForm.controls.name" fieldId="s-name">
          <input id="s-name" type="text" class="field" formControlName="name" autocomplete="name" />
        </app-field>
        <app-field
          label="Mobile number"
          [required]="true"
          [control]="profileForm.controls.phone"
          fieldId="s-phone"
        >
          <input id="s-phone" type="tel" class="field" formControlName="phone" autocomplete="tel" />
        </app-field>
        <app-field
          label="Email address"
          [required]="true"
          [control]="profileForm.controls.email"
          fieldId="s-email"
          class="sm:col-span-2"
        >
          <input id="s-email" type="email" class="field" formControlName="email" autocomplete="email" />
        </app-field>
        <app-field label="Language" [control]="profileForm.controls.language" fieldId="s-lang">
          <select id="s-lang" class="field" formControlName="language">
            <option value="en">English</option>
            <option value="ur">اردو (Urdu)</option>
          </select>
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

    <!-- Notification preferences -->
    <section class="panel mt-6 p-6">
      <h3 class="font-display text-xl">What we send you</h3>
      <p class="mt-1.5 text-sm text-ink-600">
        Order updates cannot be turned off, because you need them to receive your food.
      </p>
      <ul class="mt-5 divide-y divide-ink-200">
        @for (pref of preferences; track pref.key) {
          <li class="flex items-start justify-between gap-4 py-4">
            <div>
              <p class="text-sm font-semibold text-ink-900">{{ pref.label }}</p>
              <p class="mt-0.5 text-caption text-ink-500">{{ pref.description }}</p>
            </div>
            <label class="relative inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                class="peer sr-only"
                [checked]="prefValue(pref.key)"
                [disabled]="pref.locked"
                [attr.aria-label]="pref.label"
                (change)="togglePref(pref.key, $any($event.target).checked)"
              />
              <span
                class="h-6 w-11 rounded-full bg-ink-300 transition-colors peer-checked:bg-clay-600 peer-disabled:opacity-50"
              ></span>
              <span
                class="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
              ></span>
            </label>
          </li>
        }
      </ul>
    </section>

    <!-- Password -->
    <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="panel mt-6 p-6">
      <h3 class="font-display text-xl">Change password</h3>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <app-field
          label="Current password"
          [required]="true"
          [control]="passwordForm.controls.current"
          fieldId="p-current"
          class="sm:col-span-2"
        >
          <input
            id="p-current"
            type="password"
            class="field"
            formControlName="current"
            autocomplete="current-password"
          />
        </app-field>
        <app-field
          label="New password"
          [required]="true"
          [control]="passwordForm.controls.next"
          fieldId="p-next"
          hint="At least eight characters."
        >
          <input
            id="p-next"
            type="password"
            class="field"
            formControlName="next"
            autocomplete="new-password"
          />
        </app-field>
        <app-field
          label="Confirm new password"
          [required]="true"
          [control]="passwordForm.controls.confirm"
          fieldId="p-confirm"
        >
          <input
            id="p-confirm"
            type="password"
            class="field"
            formControlName="confirm"
            autocomplete="new-password"
          />
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

    <!-- Danger zone -->
    <section class="mt-6 rounded-2xl border border-red-500/25 bg-red-50 p-6">
      <h3 class="font-display text-xl text-red-800">Close your account</h3>
      <p class="mt-2 text-sm leading-relaxed text-ink-700">
        Your profile, addresses and wishlist are removed. Past orders are kept without your personal
        details, because we are required to hold sales records for tax purposes.
      </p>
      <button type="button" class="btn btn-danger btn-md mt-5" (click)="confirmDelete.set(true)">
        <app-icon name="trash" [size]="15" />
        Close my account
      </button>
    </section>

    <app-confirm-dialog
      [(open)]="confirmDelete"
      title="Close your account?"
      message="This cannot be undone. Your saved addresses and wishlist will be removed and you will be signed out."
      confirmLabel="Yes, close it"
      [danger]="true"
      (confirmed)="closeAccount()"
    />
  `,
})
export class AccountSettingsPage {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);

  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal('');
  protected readonly confirmDelete = signal(false);
  private readonly reload = signal(0);

  protected readonly preferences = [
    {
      key: 'orderUpdates' as const,
      label: 'Order updates',
      description: 'Confirmation, preparation and delivery. Always on.',
      locked: true,
    },
    {
      key: 'smsAlerts' as const,
      label: 'SMS alerts',
      description: 'A text when the rider sets off.',
      locked: false,
    },
    {
      key: 'marketingEmails' as const,
      label: 'Offers and news',
      description: 'Occasional emails about what is running. Never more than monthly.',
      locked: false,
    },
  ];

  private readonly record = toSignal(
    toObservable(computed(() => `${this.auth.user()?.id}:${this.reload()}`)).pipe(
      switchMap(() => this.auth.currentUserRecord()),
    ),
    { initialValue: null as User | null },
  );

  protected readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required, pakPhoneValidator()]],
    email: ['', [Validators.required, Validators.email]],
    language: ['en'],
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      current: ['', [Validators.required]],
      next: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]],
    },
    { validators: matchFieldsValidator('next', 'confirm') },
  );

  constructor() {
    this.seo.apply({
      title: 'Account Settings | Salateen Restaurant Swabi',
      description: 'Manage your Salateen Restaurant account details and preferences.',
      path: 'account/settings',
      noIndex: true,
    });

    effect(() => {
      const user = this.record();
      if (!user) return;
      this.profileForm.patchValue(
        {
          name: user.name,
          phone: user.phone,
          email: user.email,
          language: user.preferences.language,
        },
        { emitEvent: false },
      );
    });
  }

  protected prefValue(key: 'orderUpdates' | 'smsAlerts' | 'marketingEmails'): boolean {
    return this.record()?.preferences[key] ?? false;
  }

  protected togglePref(
    key: 'orderUpdates' | 'smsAlerts' | 'marketingEmails',
    value: boolean,
  ): void {
    const user = this.record();
    if (!user) return;
    this.auth
      .updateProfile({ preferences: { ...user.preferences, [key]: value } })
      .subscribe({
        next: () => {
          this.reload.update((n) => n + 1);
          this.toast.success('Preference saved');
        },
        error: () => this.toast.error('That did not save'),
      });
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      revealErrors(this.profileForm);
      return;
    }
    const user = this.record();
    if (!user) return;

    this.savingProfile.set(true);
    const value = this.profileForm.getRawValue();
    this.auth
      .updateProfile({
        name: value.name.trim(),
        phone: normalisePhone(value.phone),
        email: value.email.trim().toLowerCase(),
        preferences: { ...user.preferences, language: value.language as 'en' | 'ur' },
      })
      .subscribe({
        next: () => {
          this.savingProfile.set(false);
          this.reload.update((n) => n + 1);
          this.toast.success('Details saved');
        },
        error: () => {
          this.savingProfile.set(false);
          this.toast.error('That did not save', 'Please try again.');
        },
      });
  }

  protected changePassword(): void {
    this.passwordError.set('');
    if (this.passwordForm.invalid) {
      revealErrors(this.passwordForm);
      return;
    }
    this.savingPassword.set(true);
    const { current, next } = this.passwordForm.getRawValue();
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

  protected closeAccount(): void {
    // Deactivate rather than hard delete, so historical orders keep referential
    // integrity. Laravel will implement this as a soft delete plus a scheduled
    // anonymisation job. See BACKEND_PLAN.md.
    this.auth.updateProfile({ isActive: false }).subscribe({
      next: () => {
        this.toast.info('Account closed', 'We are sorry to see you go.');
        this.auth.logout();
        void this.router.navigate(['/']);
      },
      error: () => this.toast.error('That did not work', 'Please call us on 0312-0991116.'),
    });
  }
}
