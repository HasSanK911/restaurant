import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReactiveFormsModule, IconComponent, FieldComponent, SpinnerComponent],
  template: `
    <div>
      <p class="eyebrow mb-3">Join us</p>
      <h1 class="text-3xl leading-tight sm:text-4xl">Create your account</h1>
      <p class="mt-3 text-sm leading-relaxed text-ink-600">
        Free, takes a minute, and gets you ten percent off your first online order.
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 space-y-4">
        @if (error()) {
          <div
            class="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-50 p-4"
            role="alert"
          >
            <app-icon name="alert" [size]="17" class="mt-0.5 shrink-0 text-red-600" />
            <p class="text-sm text-red-700">{{ error() }}</p>
          </div>
        }

        <app-field label="Full name" [required]="true" [control]="form.controls.name" fieldId="rname">
          <input id="rname" type="text" class="field" formControlName="name" autocomplete="name" />
        </app-field>

        <app-field
          label="Mobile number"
          [required]="true"
          [control]="form.controls.phone"
          fieldId="rphone"
          hint="We use this to confirm orders and bookings."
        >
          <input
            id="rphone"
            type="tel"
            class="field"
            formControlName="phone"
            autocomplete="tel"
            placeholder="0312-0991116"
          />
        </app-field>

        <app-field label="Email address" [required]="true" [control]="form.controls.email" fieldId="remail">
          <input
            id="remail"
            type="email"
            class="field"
            formControlName="email"
            autocomplete="email"
            placeholder="you@example.com"
          />
        </app-field>

        <app-field
          label="Password"
          [required]="true"
          [control]="form.controls.password"
          fieldId="rpassword"
          hint="At least eight characters."
        >
          <div class="relative">
            <input
              id="rpassword"
              [type]="showPassword() ? 'text' : 'password'"
              class="field pr-12"
              formControlName="password"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 transition-colors hover:text-ink-700"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              (click)="showPassword.set(!showPassword())"
            >
              <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="17" />
            </button>
          </div>
        </app-field>

        <app-field
          label="Confirm password"
          [required]="true"
          [control]="form.controls.confirmPassword"
          fieldId="rconfirm"
        >
          <input
            id="rconfirm"
            [type]="showPassword() ? 'text' : 'password'"
            class="field"
            formControlName="confirmPassword"
            autocomplete="new-password"
          />
        </app-field>

        <label class="flex cursor-pointer items-start gap-3 text-sm text-ink-600">
          <input
            type="checkbox"
            class="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-clay-600)]"
            formControlName="acceptTerms"
          />
          <span>
            I agree to the
            <a routerLink="/terms" class="font-semibold text-clay-700 hover:underline">terms</a>
            and the
            <a routerLink="/privacy-policy" class="font-semibold text-clay-700 hover:underline"
              >privacy policy</a
            >.
          </span>
        </label>
        @if (form.controls.acceptTerms.touched && form.controls.acceptTerms.invalid) {
          <p class="field-error" role="alert">
            <app-icon name="alert" [size]="13" />
            Please accept the terms to continue.
          </p>
        }

        <label class="flex cursor-pointer items-start gap-3 text-sm text-ink-600">
          <input
            type="checkbox"
            class="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-clay-600)]"
            formControlName="marketing"
          />
          <span>Tell me about offers occasionally. You can turn this off any time.</span>
        </label>

        <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="loading()">
          @if (loading()) {
            <app-spinner [size]="17" />
            Creating your account
          } @else {
            Create account
            <app-icon name="arrow-right" [size]="16" />
          }
        </button>
      </form>

      <p class="mt-7 text-sm text-ink-600">
        Already have an account?
        <a routerLink="/auth/login" class="font-semibold text-clay-700 hover:underline">Sign in</a>
      </p>

      <div class="mt-6 flex items-start gap-3 rounded-xl border border-ink-200 bg-ink-50 p-4">
        <app-icon name="shield" [size]="16" class="mt-0.5 shrink-0 text-clay-600" />
        <p class="text-caption leading-relaxed text-ink-600">
          We never ask for card or bank details. Salateen takes cash only, on delivery or at the
          counter.
        </p>
      </div>
    </div>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, pakPhoneValidator()]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
      marketing: [true],
    },
    { validators: matchFieldsValidator('password', 'confirmPassword') },
  );

  constructor() {
    this.seo.apply({
      title: 'Create an Account | Salateen Restaurant Swabi',
      description: 'Create a Salateen Restaurant account to order faster and track deliveries.',
      path: 'auth/register',
      noIndex: true,
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      revealErrors(this.form);
      return;
    }
    this.loading.set(true);
    this.error.set('');

    const { name, email, phone, password } = this.form.getRawValue();
    this.auth
      .register({ name: name.trim(), email: email.trim(), phone: normalisePhone(phone), password })
      .subscribe({
        next: (session) => {
          this.loading.set(false);
          this.toast.success(
            `Welcome, ${session.user.name.split(' ')[0]}`,
            'Use SALATEEN10 for ten percent off your first order.',
          );
          void this.router.navigate(['/account']);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(
            err instanceof Error ? err.message : 'We could not create that account. Please try again.',
          );
        },
      });
  }
}
