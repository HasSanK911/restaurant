import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BRAND } from '../../core/constants/app.constants';
import { SeoService } from '../../core/services/seo.service';
import { revealErrors } from '../../shared/validators/form.validators';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { FieldComponent } from '../../shared/components/ui/form.components';
import { SpinnerComponent } from '../../shared/components/ui/feedback.components';

/**
 * Password reset request.
 *
 * JSON Server cannot send email, so this is a UI-complete stub: it validates,
 * shows the confirmation state, and is explicit that the real flow arrives with
 * the Laravel backend. See BACKEND_PLAN.md, "Authentication".
 */
@Component({
  selector: 'app-forgot-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReactiveFormsModule, IconComponent, FieldComponent, SpinnerComponent],
  template: `
    <div>
      @if (!sent()) {
        <p class="eyebrow mb-3">Password reset</p>
        <h1 class="text-3xl leading-tight sm:text-4xl">Forgotten your password?</h1>
        <p class="mt-3 text-sm leading-relaxed text-ink-600">
          Give us the email on your account and we will send a reset link. If you would rather not
          wait, just call the restaurant.
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 space-y-4">
          <app-field
            label="Email address"
            [required]="true"
            [control]="form.controls.email"
            fieldId="fp-email"
          >
            <input
              id="fp-email"
              type="email"
              class="field"
              formControlName="email"
              autocomplete="email"
              placeholder="you@example.com"
            />
          </app-field>

          <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="loading()">
            @if (loading()) {
              <app-spinner [size]="17" />
              Sending
            } @else {
              Send reset link
              <app-icon name="mail" [size]="16" />
            }
          </button>
        </form>
      } @else {
        <span
          class="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-600/25 bg-emerald-50 text-emerald-700"
        >
          <app-icon name="mail" [size]="28" />
        </span>
        <h1 class="mt-6 text-3xl leading-tight sm:text-4xl">Check your email</h1>
        <p class="mt-3 text-sm leading-relaxed text-ink-600">
          If an account exists for
          <span class="font-semibold text-ink-900">{{ submittedEmail() }}</span>
          , a reset link is on its way. The link expires in sixty minutes.
        </p>
        <button type="button" class="btn btn-secondary btn-md mt-7" (click)="sent.set(false)">
          Use a different email
        </button>
      }

      <!-- Demo honesty -->
      <div class="mt-8 flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-50 p-4">
        <app-icon name="info" [size]="16" class="mt-0.5 shrink-0 text-amber-700" />
        <p class="text-caption leading-relaxed text-ink-700">
          <span class="font-semibold">Demo build.</span> This form validates and confirms, but no
          email is actually sent: the JSON Server backend has no mail transport. The real flow
          arrives with the Laravel API. In the meantime, every demo account uses the password
          <code class="font-mono font-semibold">salateen123</code>.
        </p>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <a routerLink="/auth/login" class="flex items-center gap-1.5 font-semibold text-clay-700 hover:underline">
          <app-icon name="arrow-left" [size]="13" />
          Back to sign in
        </a>
        <a [href]="'tel:' + brand.phone" class="text-ink-600 hover:text-clay-700">
          Or call {{ brand.phoneDisplay }}
        </a>
      </div>
    </div>
  `,
})
export class ForgotPasswordPage {
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);

  protected readonly brand = BRAND;
  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly submittedEmail = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.seo.apply({
      title: 'Reset Your Password | Salateen Restaurant Swabi',
      description: 'Request a password reset link for your Salateen Restaurant account.',
      path: 'auth/forgot-password',
      noIndex: true,
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      revealErrors(this.form);
      return;
    }
    this.loading.set(true);
    const email = this.form.getRawValue().email.trim();

    // Simulated latency so the button state is visible in the demo.
    setTimeout(() => {
      this.loading.set(false);
      this.submittedEmail.set(email);
      this.sent.set(true);
    }, 700);
  }
}
