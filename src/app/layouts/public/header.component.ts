import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { BRAND } from '../../core/constants/app.constants';
import { NavGroup, PRIMARY_NAV } from '../../core/constants/navigation.constants';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';

/**
 * Sticky header.
 *
 * Transparent over a hero until the page scrolls, then it condenses into a
 * glass bar. Desktop gets a hover/focus mega menu; mobile gets a full-screen
 * sheet. Both are driven by the same `PRIMARY_NAV` constant so the two never
 * drift apart.
 */
@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent, ImageComponent],
  template: `
    <!-- Announcement rail -->
    @if (announcement() && !scrolled()) {
      <div
        class="relative z-[var(--z-header)] overflow-hidden bg-gradient-to-r from-clay-700 via-clay-600 to-clay-700"
      >
        <div class="container-lux flex h-9 items-center justify-center gap-3 text-center">
          <app-icon name="sparkle" [size]="13" class="hidden text-clay-200 sm:block" />
          <p class="truncate text-caption font-medium tracking-wide text-white">
            {{ announcement() }}
          </p>
        </div>
      </div>
    }

    <header
      class="sticky top-0 z-[var(--z-header)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      [class]="scrolled() ? 'glass-strong shadow-lux' : 'bg-paper'"
      (mouseleave)="closeMega()"
    >
      <div class="container-lux">
        <div
          class="flex items-center justify-between transition-all duration-400"
          [class]="scrolled() ? 'h-16' : 'h-[4.5rem]'"
        >
          <!-- Brand -->
          <a routerLink="/" class="group flex shrink-0 items-center gap-3" aria-label="Salateen Restaurant, home">
            <img
              src="assets/brand/logo-mark.svg"
              alt=""
              aria-hidden="true"
              class="h-10 w-10 transition-transform duration-500 group-hover:rotate-[14deg]"
              width="40"
              height="40"
            />
            <span class="hidden leading-none sm:block">
              <span class="block font-display text-xl font-semibold tracking-wide text-ink-900"
                >Salateen</span
              >
              <span class="mt-0.5 block text-micro font-semibold tracking-[0.36em] text-clay-600"
                >SWABI</span
              >
            </span>
          </a>

          <!-- Desktop navigation -->
          <nav class="hidden items-center gap-1 lg:flex" aria-label="Primary">
            @for (group of nav; track group.label) {
              <div class="relative">
                @if (group.path) {
                  <a
                    [routerLink]="group.path"
                    routerLinkActive="text-clay-700"
                    [routerLinkActiveOptions]="{ exact: group.path === '/' }"
                    class="flex items-center gap-1.5 rounded-full px-4 py-2 text-label font-semibold text-ink-800 transition-colors hover:text-clay-700"
                    (mouseenter)="openMega(group)"
                    (focus)="openMega(group)"
                  >
                    {{ group.label }}
                    @if (group.columns) {
                      <app-icon
                        name="chevron-down"
                        [size]="13"
                        [strokeWidth]="2.2"
                        class="transition-transform duration-300"
                        [class.rotate-180]="activeMega() === group.label"
                      />
                    }
                  </a>
                } @else {
                  <button
                    type="button"
                    class="flex items-center gap-1.5 rounded-full px-4 py-2 text-label font-semibold text-ink-800 transition-colors hover:text-clay-700"
                    [class.text-clay-700]="activeMega() === group.label"
                    [attr.aria-expanded]="activeMega() === group.label"
                    (mouseenter)="openMega(group)"
                    (focus)="openMega(group)"
                    (click)="toggleMega(group)"
                  >
                    {{ group.label }}
                    <app-icon
                      name="chevron-down"
                      [size]="13"
                      [strokeWidth]="2.2"
                      class="transition-transform duration-300"
                      [class.rotate-180]="activeMega() === group.label"
                    />
                  </button>
                }
              </div>
            }
          </nav>

          <!-- Actions -->
          <div class="flex items-center gap-1.5">
            <a
              [href]="'tel:' + brand.phone"
              class="hidden items-center gap-2 rounded-full border border-clay-500/25 px-3.5 py-2 text-xs font-semibold text-clay-700 transition-colors hover:border-clay-400 hover:bg-clay-500/8 xl:flex"
            >
              <app-icon name="phone" [size]="14" />
              {{ brand.phoneDisplay }}
            </a>

            <a
              routerLink="/menu"
              class="btn btn-ghost btn-icon"
              aria-label="Search the menu"
              [queryParams]="{ focus: 'search' }"
            >
              <app-icon name="search" [size]="19" />
            </a>

            <button
              type="button"
              class="btn btn-ghost btn-icon relative"
              [attr.aria-label]="'Your order, ' + cartCount() + ' items'"
              (click)="cart.open()"
            >
              <app-icon name="bag" [size]="19" />
              @if (cartCount() > 0) {
                <span
                  class="absolute -top-0.5 -right-0.5 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-gradient-to-br from-clay-300 to-clay-600 px-1 text-caption font-extrabold text-white"
                  >{{ cartCount() > 99 ? '99+' : cartCount() }}</span
                >
              }
            </button>

            @if (auth.isAuthenticated()) {
              <a
                [routerLink]="auth.isAdminSide() ? '/admin' : '/account'"
                class="hidden h-10 w-10 items-center justify-center rounded-full border border-clay-500/30 bg-clay-500/8 text-xs font-bold text-clay-700 transition-colors hover:border-clay-400 sm:flex"
                [attr.aria-label]="'Signed in as ' + auth.user()!.name"
                >{{ auth.initials() }}</a
              >
            } @else {
              <a routerLink="/auth/login" class="btn btn-ghost btn-icon hidden sm:flex" aria-label="Sign in">
                <app-icon name="user" [size]="19" />
              </a>
            }

            <a routerLink="/reservation" class="btn btn-primary btn-sm ml-1 hidden md:inline-flex">
              Book a Table
            </a>

            <button
              type="button"
              class="btn btn-ghost btn-icon lg:hidden"
              [attr.aria-expanded]="mobileOpen()"
              aria-label="Open menu"
              (click)="mobileOpen.set(true)"
            >
              <app-icon name="menu" [size]="21" />
            </button>
          </div>
        </div>
      </div>

      <!-- Mega menu -->
      @if (megaGroup(); as group) {
        <div
          class="glass-strong absolute inset-x-0 top-full hidden border-t border-clay-500/12 shadow-lux lg:block"
          style="animation: fade-in 0.22s ease-out both"
          (mouseenter)="keepMega()"
        >
          <div class="container-lux grid grid-cols-12 gap-8 py-9">
            @for (column of group.columns ?? []; track column.heading) {
              <div class="col-span-3">
                <p class="eyebrow mb-4">{{ column.heading }}</p>
                <ul class="space-y-0.5">
                  @for (link of column.links; track link.path) {
                    <li>
                      <a
                        [routerLink]="link.path"
                        class="group/link block rounded-lg px-3 py-2 transition-colors hover:bg-clay-500/6"
                        (click)="closeMega()"
                      >
                        <span
                          class="flex items-center gap-1.5 text-body-sm font-semibold text-ink-800 transition-colors group-hover/link:text-clay-700"
                        >
                          {{ link.label }}
                          <app-icon
                            name="arrow-right"
                            [size]="13"
                            class="-translate-x-1 opacity-0 transition-all group-hover/link:translate-x-0 group-hover/link:opacity-100"
                          />
                        </span>
                        @if (link.description) {
                          <span class="mt-0.5 block text-xs text-ink-500">{{ link.description }}</span>
                        }
                      </a>
                    </li>
                  }
                </ul>
              </div>
            }

            @if (group.feature; as feature) {
              <div class="col-span-3">
                <a
                  [routerLink]="feature.link"
                  class="group/feat relative block h-full min-h-52 overflow-hidden rounded-xl border border-clay-500/15"
                  (click)="closeMega()"
                >
                  <app-image
                    [src]="feature.image"
                    [alt]="feature.title"
                    sizes="20rem"
                    class="absolute inset-0 h-full w-full transition-transform duration-[900ms] group-hover/feat:scale-110"
                  />
                  <div
                    class="absolute inset-0 bg-gradient-to-t from-scrim via-scrim/70 to-transparent"
                  ></div>
                  <div class="relative flex h-full flex-col justify-end p-5">
                    <p class="font-display text-xl text-white">{{ feature.title }}</p>
                    <p class="mt-1.5 text-xs leading-relaxed text-white/75">{{ feature.blurb }}</p>
                    <span
                      class="mt-3 flex items-center gap-1.5 text-micro font-bold tracking-[0.14em] text-clay-200 uppercase"
                    >
                      {{ feature.cta }}
                      <app-icon name="arrow-right" [size]="13" />
                    </span>
                  </div>
                </a>
              </div>
            }
          </div>
        </div>
      }
    </header>

    <!-- Mobile sheet -->
    <div
      class="fixed inset-0 z-[var(--z-drawer)] lg:hidden"
      [class]="mobileOpen() ? 'pointer-events-auto' : 'pointer-events-none'"
      [attr.aria-hidden]="!mobileOpen()"
    >
      <div
        class="absolute inset-0 bg-scrim/45 backdrop-blur-sm transition-opacity duration-300"
        [class]="mobileOpen() ? 'opacity-100' : 'opacity-0'"
        (click)="mobileOpen.set(false)"
      ></div>
      <nav
        class="absolute inset-y-0 right-0 flex w-[min(92vw,22rem)] flex-col border-l border-clay-500/12 bg-ink-50 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
        [class]="mobileOpen() ? 'translate-x-0' : 'translate-x-full'"
        aria-label="Mobile navigation"
      >
        <div class="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <span class="font-display text-xl text-ink-900">Menu</span>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            aria-label="Close menu"
            (click)="mobileOpen.set(false)"
          >
            <app-icon name="close" [size]="19" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-3 py-4">
          @for (group of nav; track group.label) {
            @if (group.columns) {
              <details class="group/det border-b border-ink-200/70">
                <summary
                  class="flex cursor-pointer list-none items-center justify-between px-3 py-3.5 text-base font-semibold text-ink-900 marker:hidden"
                >
                  {{ group.label }}
                  <app-icon
                    name="chevron-down"
                    [size]="15"
                    class="text-ink-500 transition-transform group-open/det:rotate-180"
                  />
                </summary>
                <div class="space-y-4 pb-4">
                  @for (column of group.columns; track column.heading) {
                    <div>
                      <p class="eyebrow px-3 py-1.5">{{ column.heading }}</p>
                      @for (link of column.links; track link.path) {
                        <a
                          [routerLink]="link.path"
                          class="block rounded-lg px-3 py-2 text-sm text-ink-700 transition-colors hover:bg-ink-100 hover:text-clay-700"
                          (click)="mobileOpen.set(false)"
                          >{{ link.label }}</a
                        >
                      }
                    </div>
                  }
                </div>
              </details>
            } @else {
              <a
                [routerLink]="group.path"
                routerLinkActive="text-clay-700"
                [routerLinkActiveOptions]="{ exact: group.path === '/' }"
                class="block border-b border-ink-200/70 px-3 py-3.5 text-base font-semibold text-ink-900 transition-colors hover:text-clay-700"
                (click)="mobileOpen.set(false)"
                >{{ group.label }}</a
              >
            }
          }

          <div class="mt-5 space-y-2.5 px-3">
            <a
              routerLink="/reservation"
              class="btn btn-primary btn-md w-full"
              (click)="mobileOpen.set(false)"
              >Book a Table</a
            >
            <a
              [routerLink]="auth.isAuthenticated() ? (auth.isAdminSide() ? '/admin' : '/account') : '/auth/login'"
              class="btn btn-secondary btn-md w-full"
              (click)="mobileOpen.set(false)"
              >{{ auth.isAuthenticated() ? 'My Account' : 'Sign In' }}</a
            >
            <a [href]="'tel:' + brand.phone" class="btn btn-ghost btn-md w-full border border-ink-200">
              <app-icon name="phone" [size]="15" />
              {{ brand.phoneDisplay }}
            </a>
          </div>

          <div class="mt-6 rounded-xl border border-ink-200 bg-ink-50 p-4">
            <p class="flex items-center gap-2 text-xs font-semibold" [class]="status().isOpen ? 'text-emerald-700' : 'text-amber-700'">
              <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
              {{ status().label }}
            </p>
            <p class="mt-2 text-xs leading-relaxed text-ink-500">
              {{ brand.street }}, {{ brand.city }}
            </p>
          </div>
        </div>
      </nav>
    </div>
  `,
})
export class HeaderComponent {
  protected readonly nav: NavGroup[] = PRIMARY_NAV;
  protected readonly brand = BRAND;

  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly restaurant = inject(RestaurantService);
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);

  protected readonly scrolled = signal(false);
  protected readonly mobileOpen = signal(false);
  protected readonly activeMega = signal<string | null>(null);

  protected readonly cartCount = this.cart.itemCount;
  protected readonly status = this.restaurant.status;
  protected readonly announcement = computed(() => this.restaurant.settings()?.announcement ?? null);

  protected readonly megaGroup = computed(() =>
    this.nav.find((g) => g.label === this.activeMega() && g.columns),
  );

  /** Closing on navigation keeps the sheet from surviving a route change. */
  private readonly navEnd = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: '' },
  );

  constructor() {
    effect(() => {
      this.navEnd();
      this.mobileOpen.set(false);
      this.activeMega.set(null);
    });

    // Body scroll lock while the mobile sheet is open.
    effect(() => {
      const body = this.doc.body;
      if (!body) return;
      body.style.overflow = this.mobileOpen() ? 'hidden' : '';
    });
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.mobileOpen.set(false);
    this.activeMega.set(null);
  }

  protected openMega(group: NavGroup): void {
    this.activeMega.set(group.columns ? group.label : null);
  }

  protected toggleMega(group: NavGroup): void {
    this.activeMega.update((current) => (current === group.label ? null : group.label));
  }

  protected keepMega(): void {
    /* Presence of this handler stops the container's mouseleave from firing early. */
  }

  protected closeMega(): void {
    this.activeMega.set(null);
  }
}
