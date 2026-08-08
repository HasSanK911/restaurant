import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { revealErrors } from '../../shared/validators/form.validators';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { FieldComponent } from '../../shared/components/ui/form.components';
import { SpinnerComponent } from '../../shared/components/ui/feedback.components';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReactiveFormsModule, IconComponent, FieldComponent, SpinnerComponent],
  template: `
    <div>
      <p class="eyebrow mb-3">Welcome back</p>
      <h1 class="text-3xl leading-tight sm:text-4xl">Sign in to your account</h1>
      <p class="mt-3 text-sm leading-relaxed text-ink-600">
        Reorder in two taps, track deliveries and keep your favourites in one place.
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

        <app-field label="Email address" [required]="true" [control]="form.controls.email" fieldId="email">
          <input
            id="email"
            type="email"
            class="field"
            formControlName="email"
            autocomplete="email"
            placeholder="you@example.com"
          />
        </app-field>

        <app-field label="Password" [required]="true" [control]="form.controls.password" fieldId="password">
          <div class="relative">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              class="field pr-12"
              formControlName="password"
              autocomplete="current-password"
              placeholder="Your password"
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

        <div class="flex items-center justify-between gap-4">
          <label class="flex cursor-pointer items-center gap-2.5 text-sm text-ink-600">
            <input
              type="checkbox"
              class="h-4 w-4 accent-[var(--color-clay-600)]"
              formControlName="remember"
            />
            Keep me signed in
          </label>
          <a routerLink="/auth/forgot-password" class="text-sm font-semibold text-clay-700 hover:underline"
            >Forgot password?</a
          >
        </div>

        <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="loading()">
          @if (loading()) {
            <app-spinner [size]="17" />
            Signing in
          } @else {
            Sign in
            <app-icon name="log-in" [size]="16" />
          }
        </button>
      </form>

      <!-- Demo shortcut -->
      <div class="mt-7 rounded-xl border border-ink-200 bg-ink-50 p-4">
        <p class="text-caption font-semibold text-ink-700">Trying the demo?</p>
        <div class="mt-2.5 flex flex-wrap gap-2">
          @for (account of quickFill; track account.email) {
            <button
              type="button"
              class="chip border-clay-600/30 bg-white text-clay-700 transition-colors hover:bg-clay-50"
              (click)="fill(account.email)"
            >
              {{ account.label }}
            </button>
          }
        </div>
      </div>

      <p class="mt-8 text-sm text-ink-600">
        No account yet?
        <a routerLink="/auth/register" class="font-semibold text-clay-700 hover:underline"
          >Create one</a
        >
        &mdash; it takes a minute and you can still order without one.
      </p>
    </div>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);

  protected readonly quickFill = [
    { label: 'Customer', email: 'customer@example.com' },
    { label: 'Admin', email: 'admin@salateenrestaurant.pk' },
    { label: 'Manager', email: 'manager@salateenrestaurant.pk' },
    { label: 'Kitchen', email: 'kitchen@salateenrestaurant.pk' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true],
  });

  constructor() {
    this.seo.apply({
      title: 'Sign In | Salateen Restaurant Swabi',
      description: 'Sign in to your Salateen Restaurant account.',
      path: 'auth/login',
      noIndex: true,
    });
  }

  protected fill(email: string): void {
    this.form.patchValue({ email, password: 'salateen123' });
    this.error.set('');
  }

  protected submit(): void {
    if (this.form.invalid) {
      revealErrors(this.form);
      return;
    }
    this.loading.set(true);
    this.error.set('');

    const { email, password, remember } = this.form.getRawValue();
    this.auth.login({ email, password, remember }).subscribe({
      next: (session) => {
        this.loading.set(false);
        this.toast.success(`Welcome back, ${session.user.name.split(' ')[0]}`);

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const fallback = this.auth.isAdminSide() ? '/admin' : '/account';
        void this.router.navigateByUrl(returnUrl ?? fallback);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(
          err instanceof Error ? err.message : 'We could not sign you in. Please try again.',
        );
      },
    });
  }
}
