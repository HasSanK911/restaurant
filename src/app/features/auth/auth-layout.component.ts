import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { BRAND } from '../../core/constants/app.constants';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';

/**
 * Split-screen auth shell: the form on the left, a photograph and the demo
 * credentials on the right. Deliberately outside the public layout so there is
 * no header, footer or cart to distract from the single task.
 */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, ImageComponent, IconComponent],
  template: `
    <div class="grid min-h-svh lg:grid-cols-2">
      <!-- Form side -->
      <div class="flex flex-col px-5 py-8 sm:px-10 lg:px-16">
        <a routerLink="/" class="flex items-center gap-3 self-start" aria-label="Salateen Restaurant, home">
          <img src="assets/brand/logo-mark.svg" alt="" aria-hidden="true" class="h-11 w-11" width="44" height="44" />
          <span class="leading-none">
            <span class="block font-display text-xl font-semibold text-ink-900">Salateen</span>
            <span class="mt-0.5 block text-micro font-semibold tracking-[0.3em] text-clay-600"
              >SWABI</span
            >
          </span>
        </a>

        <div class="flex flex-1 items-center py-10">
          <div class="w-full max-w-md">
            <router-outlet />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-ink-500">
          <a routerLink="/" class="flex items-center gap-1.5 transition-colors hover:text-clay-700">
            <app-icon name="arrow-left" [size]="12" />
            Back to the site
          </a>
          <a routerLink="/privacy-policy" class="transition-colors hover:text-clay-700">Privacy</a>
          <a routerLink="/terms" class="transition-colors hover:text-clay-700">Terms</a>
          <a [href]="'tel:' + brand.phone" class="transition-colors hover:text-clay-700">{{
            brand.phoneDisplay
          }}</a>
        </div>
      </div>

      <!-- Photo side -->
      <aside class="relative hidden overflow-hidden lg:block">
        <app-image
          src="assets/images/interior/mural-hall"
          alt="The hand-painted mural wall in the main hall at Salateen Restaurant"
          [priority]="true"
          sizes="50vw"
          class="absolute inset-0 h-full w-full"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-scrim via-scrim/55 to-scrim/25"></div>

        <div class="on-photo relative flex h-full flex-col justify-end p-14">
          <p class="eyebrow mb-4">Since 2011 on Jhangira Road</p>
          <p class="max-w-md font-display text-4xl leading-tight text-white">
            Charcoal, copper and Kabuli rice
          </p>
          <p class="mt-4 max-w-md leading-relaxed text-white/75">
            Sign in to reorder in two taps, track what is on its way, and keep your favourite dishes
            in one place.
          </p>

          <!-- Demo credentials: this is a demo build, so say so plainly -->
          <div class="glass-dark mt-10 max-w-md rounded-2xl p-5">
            <p class="flex items-center gap-2 text-micro font-bold tracking-[0.16em] text-clay-200 uppercase">
              <app-icon name="info" [size]="13" />
              Demo accounts
            </p>
            <dl class="mt-3.5 space-y-2 text-caption">
              @for (account of demoAccounts; track account.email) {
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-white/60">{{ account.role }}</dt>
                  <dd class="font-mono text-white/90">{{ account.email }}</dd>
                </div>
              }
              <div class="flex items-center justify-between gap-4 border-t border-white/15 pt-2">
                <dt class="text-white/60">Password (all)</dt>
                <dd class="font-mono text-white/90">salateen123</dd>
              </div>
            </dl>
          </div>
        </div>
      </aside>
    </div>
  `,
})
export class AuthLayoutComponent {
  protected readonly brand = BRAND;

  protected readonly demoAccounts = [
    { role: 'Customer', email: 'customer@example.com' },
    { role: 'Administrator', email: 'admin@salateenrestaurant.pk' },
    { role: 'Manager', email: 'manager@salateenrestaurant.pk' },
    { role: 'Kitchen', email: 'kitchen@salateenrestaurant.pk' },
  ];
}
