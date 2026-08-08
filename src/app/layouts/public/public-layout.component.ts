import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BRAND } from '../../core/constants/app.constants';
import { RestaurantService } from '../../core/services/restaurant.service';
import { SeoService } from '../../core/services/seo.service';
import { HeaderComponent } from './header.component';
import { FooterComponent } from './footer.component';
import { MobileTabBarComponent } from './mobile-tab-bar.component';
import { CartDrawerComponent } from './cart-drawer.component';
import { IconComponent } from '../../shared/components/ui/icon.component';

/**
 * Shell for every public-facing route: header, content, footer, mobile tab bar,
 * cart drawer and the floating call/WhatsApp actions.
 *
 * The site-wide Restaurant JSON-LD is emitted here so it appears on every page
 * exactly once, which is what Google expects for a single-location business.
 */
@Component({
  selector: 'app-public-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    MobileTabBarComponent,
    CartDrawerComponent,
    IconComponent,
  ],
  template: `
    <app-header />

    <main id="main-content" class="min-h-screen pb-20 lg:pb-0">
      <router-outlet />
    </main>

    <app-footer />
    <app-mobile-tab-bar />
    <app-cart-drawer />

    <!-- Floating actions: call and WhatsApp, above the mobile tab bar -->
    <div
      class="fixed right-4 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-[var(--z-nav)] flex flex-col gap-2.5 lg:right-6 lg:bottom-6"
    >
      @if (showBackToTop()) {
        <button
          type="button"
          class="glass-strong flex h-11 w-11 items-center justify-center rounded-full text-ink-700 shadow-lux transition-all hover:-translate-y-0.5 hover:text-clay-700"
          aria-label="Back to top"
          (click)="scrollTop()"
        >
          <app-icon name="chevron-up" [size]="18" [strokeWidth]="2.2" />
        </button>
      }
      <a
        [href]="whatsappUrl"
        target="_blank"
        rel="noopener"
        class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lux transition-all hover:-translate-y-0.5 hover:bg-emerald-500"
        aria-label="Message Salateen Restaurant on WhatsApp"
      >
        <app-icon name="whatsapp" [size]="22" />
      </a>
      <a
        [href]="'tel:' + brand.phone"
        class="flex h-12 w-12 animate-[pulse-ring_2.2s_cubic-bezier(0.22,1,0.36,1)_infinite] items-center justify-center rounded-full bg-gradient-to-br from-clay-300 to-clay-600 text-white shadow-clay transition-all hover:-translate-y-0.5"
        [attr.aria-label]="'Call Salateen Restaurant on ' + brand.phoneDisplay"
      >
        <app-icon name="phone" [size]="21" [strokeWidth]="2" />
      </a>
    </div>
  `,
})
export class PublicLayoutComponent {
  private readonly restaurant = inject(RestaurantService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;
  protected readonly whatsappUrl = `https://wa.me/${BRAND.whatsapp.replace('+', '')}?text=${encodeURIComponent(
    'Assalam o Alaikum, I would like to place an order from Salateen Restaurant.',
  )}`;
  protected readonly showBackToTop = signal(false);

  constructor() {
    effect(() => {
      const profile = this.restaurant.profile();
      if (profile) this.seo.restaurantSchema(profile);
    });

    if (typeof window !== 'undefined') {
      window.addEventListener(
        'scroll',
        () => this.showBackToTop.set(window.scrollY > 900),
        { passive: true },
      );
    }
  }

  protected scrollTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
