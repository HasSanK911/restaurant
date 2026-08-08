import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND, DAY_NAMES } from '../../core/constants/app.constants';
import { FOOTER_NAV } from '../../core/constants/navigation.constants';
import { RestaurantService } from '../../core/services/restaurant.service';
import { Clock12Pipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, Clock12Pipe],
  template: `
    <footer class="relative mt-24 overflow-hidden border-t-2 border-clay-600/25 bg-ink-100">
      <!-- Ambient glow -->
      <div
        class="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-clay-600/8 blur-[120px]"
        aria-hidden="true"
      ></div>

      <div class="container-lux relative">
        <!-- CTA band -->
        <div
          class="-mt-px flex flex-col items-center gap-6 border-b border-ink-200 py-14 text-center lg:flex-row lg:justify-between lg:text-left"
        >
          <div>
            <p class="eyebrow mb-2.5">Hungry already?</p>
            <h2 class="font-display text-3xl text-ink-900 sm:text-4xl">
              A table is waiting <span class="text-gradient-clay italic">on Jhangira Road</span>
            </h2>
          </div>
          <div class="flex flex-wrap justify-center gap-3">
            <a routerLink="/reservation" class="btn btn-primary btn-lg">Book a Table</a>
            <a routerLink="/menu" class="btn btn-secondary btn-lg">Order Online</a>
          </div>
        </div>

        <!-- Columns -->
        <div class="grid gap-12 py-16 lg:grid-cols-12">
          <!-- Brand block -->
          <div class="lg:col-span-4">
            <a routerLink="/" class="flex items-center gap-3" aria-label="Salateen Restaurant, home">
              <img src="assets/brand/logo-mark.svg" alt="" aria-hidden="true" class="h-12 w-12" width="48" height="48" />
              <span class="leading-none">
                <span class="block font-display text-2xl font-semibold text-ink-900">Salateen</span>
                <span class="mt-1 block text-micro font-semibold tracking-[0.36em] text-clay-600"
                  >RESTAURANT SWABI</span
                >
              </span>
            </a>
            <p class="mt-5 max-w-sm text-sm leading-relaxed text-ink-500">
              Charcoal BBQ, hand-pressed Chapli Kabab and Kabuli Pulao steamed over mutton stock.
              Serving Swabi since {{ brand.foundedYear }}.
            </p>

            <address class="mt-6 space-y-3 text-sm not-italic">
              <a
                [href]="mapsUrl"
                target="_blank"
                rel="noopener"
                class="flex items-start gap-3 text-ink-600 transition-colors hover:text-clay-700"
              >
                <app-icon name="map" [size]="16" class="mt-0.5 shrink-0 text-clay-600" />
                <span>{{ brand.street }}<br />{{ brand.city }}, {{ brand.region }}, {{ brand.country }}</span>
              </a>
              <a
                [href]="'tel:' + brand.phone"
                class="flex items-center gap-3 text-ink-600 transition-colors hover:text-clay-700"
              >
                <app-icon name="phone" [size]="16" class="shrink-0 text-clay-600" />
                {{ brand.phoneDisplay }}
              </a>
              <a
                [href]="'mailto:' + brand.email"
                class="flex items-center gap-3 text-ink-600 transition-colors hover:text-clay-700"
              >
                <app-icon name="mail" [size]="16" class="shrink-0 text-clay-600" />
                {{ brand.email }}
              </a>
            </address>

            <div class="mt-6 flex gap-2.5">
              @for (social of socials(); track social.name) {
                <a
                  [href]="social.url"
                  target="_blank"
                  rel="noopener"
                  class="flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition-all hover:-translate-y-0.5 hover:border-clay-500/45 hover:text-clay-700"
                  [attr.aria-label]="'Salateen Restaurant on ' + social.name"
                >
                  <app-icon [name]="social.icon" [size]="17" />
                </a>
              }
            </div>
          </div>

          <!-- Link columns -->
          <div class="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-5">
            @for (column of footerNav; track column.heading) {
              <nav [attr.aria-label]="column.heading">
                <p class="eyebrow mb-4">{{ column.heading }}</p>
                <ul class="space-y-2.5">
                  @for (link of column.links; track link.path) {
                    <li>
                      <a
                        [routerLink]="link.path"
                        class="text-body-sm text-ink-500 transition-colors hover:text-clay-700"
                        >{{ link.label }}</a
                      >
                    </li>
                  }
                </ul>
              </nav>
            }
          </div>

          <!-- Hours -->
          <div class="lg:col-span-3">
            <p class="eyebrow mb-4">Opening Hours</p>
            <div
              class="rounded-xl border p-4"
              [class]="status().isOpen ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-ink-200 bg-ink-50/50'"
            >
              <p
                class="flex items-center gap-2 text-xs font-bold tracking-wide uppercase"
                [class]="status().isOpen ? 'text-emerald-700' : 'text-amber-700'"
              >
                <span class="relative flex h-2 w-2">
                  @if (status().isOpen) {
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
                  }
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-current"></span>
                </span>
                {{ status().label }}
              </p>
              <dl class="mt-4 space-y-1.5 text-label">
                @for (hour of hours(); track hour.day) {
                  <div
                    class="flex items-center justify-between gap-4"
                    [class]="hour.day === today ? 'font-semibold text-clay-700' : 'text-ink-500'"
                  >
                    <dt>{{ dayNames[hour.day] }}</dt>
                    <dd class="tabular-nums">
                      @if (hour.isClosed) {
                        Closed
                      } @else {
                        {{ hour.opensAt | clock12 }} &ndash; {{ hour.closesAt | clock12 }}
                      }
                    </dd>
                  </div>
                }
              </dl>
            </div>

            <div class="mt-4 rounded-xl border border-clay-500/18 bg-clay-500/5 p-4">
              <p class="flex items-center gap-2 text-xs font-bold tracking-wide text-clay-700 uppercase">
                <app-icon name="wallet" [size]="14" />
                Cash only
              </p>
              <p class="mt-2 text-xs leading-relaxed text-ink-500">
                Cash on delivery for home orders, cash at the counter when you dine in. We never ask
                for card details online.
              </p>
            </div>
          </div>
        </div>

        <!-- Base -->
        <div
          class="flex flex-col items-center gap-4 border-t border-ink-200 py-7 text-center sm:flex-row sm:justify-between sm:text-left"
        >
          <p class="text-xs text-ink-500">
            &copy; {{ year }} {{ brand.fullName }}. All rights reserved.
          </p>
          <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-500">
            <a routerLink="/privacy-policy" class="transition-colors hover:text-clay-700">Privacy</a>
            <a routerLink="/terms" class="transition-colors hover:text-clay-700">Terms</a>
            <a routerLink="/refund-policy" class="transition-colors hover:text-clay-700">Refunds</a>
            <a routerLink="/faq" class="transition-colors hover:text-clay-700">FAQ</a>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  private readonly restaurant = inject(RestaurantService);

  protected readonly brand = BRAND;
  protected readonly footerNav = FOOTER_NAV;
  protected readonly dayNames = DAY_NAMES;
  protected readonly year = new Date().getFullYear();
  protected readonly today = new Date().getDay();
  protected readonly status = this.restaurant.status;
  protected readonly hours = this.restaurant.hours;
  protected readonly mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(
    `${BRAND.fullName}, ${BRAND.street}, ${BRAND.city}`,
  )}`;

  protected readonly socials = computed(() => {
    const social = this.restaurant.profile()?.social;
    const entries: { name: string; url: string; icon: 'facebook' | 'instagram' | 'youtube' | 'whatsapp' | 'tiktok' }[] = [];
    if (social?.facebook) entries.push({ name: 'Facebook', url: social.facebook, icon: 'facebook' });
    if (social?.instagram) entries.push({ name: 'Instagram', url: social.instagram, icon: 'instagram' });
    if (social?.youtube) entries.push({ name: 'YouTube', url: social.youtube, icon: 'youtube' });
    if (social?.tiktok) entries.push({ name: 'TikTok', url: social.tiktok, icon: 'tiktok' });
    if (social?.whatsapp) entries.push({ name: 'WhatsApp', url: social.whatsapp, icon: 'whatsapp' });
    return entries;
  });
}
