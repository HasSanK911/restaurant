import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { STORAGE_KEYS } from '../../core/constants/api.constants';
import { ADMIN_NAV, AdminNavItem } from '../../core/constants/navigation.constants';
import { AppNotification } from '../../core/models/content.model';
import { AuthService } from '../../core/services/auth.service';
import { ContentService } from '../../core/services/content.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { StorageService } from '../../core/services/storage.service';
import { ToastService } from '../../core/services/toast.service';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { IconComponent, IconName } from '../../shared/components/ui/icon.component';

/**
 * Back-office shell.
 *
 * Collapsible sidebar (state persisted), a top bar with the live open/closed
 * badge and a notifications tray, and permission-filtered navigation so a
 * kitchen account never sees links it cannot open.
 */
@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, TimeAgoPipe],
  template: `
    <div class="min-h-svh bg-ink-50">
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-ink-200 bg-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        [class]="sidebarClasses()"
        [attr.aria-hidden]="!mobileOpen() && isMobile() ? 'true' : null"
      >
        <!-- Brand -->
        <div class="flex h-16 shrink-0 items-center gap-3 border-b border-ink-200 px-4">
          <a routerLink="/" class="flex min-w-0 items-center gap-2.5" aria-label="Salateen Restaurant, home">
            <img src="assets/brand/logo-mark.svg" alt="" aria-hidden="true" class="h-9 w-9 shrink-0" width="36" height="36" />
            @if (!collapsed()) {
              <span class="min-w-0 leading-none">
                <span class="block truncate font-display text-lg font-semibold text-ink-900">Salateen</span>
                <span class="mt-0.5 block text-micro font-semibold tracking-[0.24em] text-clay-600"
                  >ADMIN</span
                >
              </span>
            }
          </a>
          <button
            type="button"
            class="ml-auto hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900 lg:flex"
            [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
            (click)="toggleCollapse()"
          >
            <app-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="15" />
          </button>
          <button
            type="button"
            class="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 lg:hidden"
            aria-label="Close menu"
            (click)="mobileOpen.set(false)"
          >
            <app-icon name="close" [size]="17" />
          </button>
        </div>

        <!-- Nav -->
        <nav class="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Admin sections">
          @for (section of visibleNav(); track section.heading) {
            <div class="mb-5">
              @if (!collapsed()) {
                <p class="mb-2 px-3 text-micro font-bold tracking-[0.16em] text-ink-400 uppercase">
                  {{ section.heading }}
                </p>
              } @else {
                <div class="mx-3 mb-2 h-px bg-ink-200"></div>
              }
              <ul class="space-y-0.5">
                @for (item of section.items; track item.path) {
                  <li>
                    <a
                      [routerLink]="item.path"
                      routerLinkActive="bg-clay-50 text-clay-700"
                      #rla="routerLinkActive"
                      [routerLinkActiveOptions]="{ exact: !!item.exact }"
                      class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
                      [class.justify-center]="collapsed()"
                      [attr.title]="collapsed() ? item.label : null"
                      [attr.aria-current]="rla.isActive ? 'page' : null"
                    >
                      <app-icon
                        [name]="$any(item.icon)"
                        [size]="17"
                        class="shrink-0"
                        [class]="rla.isActive ? 'text-clay-600' : 'text-ink-400'"
                      />
                      @if (!collapsed()) {
                        <span class="truncate">{{ item.label }}</span>
                        @if (item.path === '/admin/notifications' && unreadCount() > 0) {
                          <span
                            class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-clay-600 px-1 text-micro font-bold text-white"
                            >{{ unreadCount() }}</span
                          >
                        }
                      }
                    </a>
                  </li>
                }
              </ul>
            </div>
          }
        </nav>

        <!-- Footer -->
        <div class="shrink-0 border-t border-ink-200 p-3">
          <a
            routerLink="/"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100"
            [class.justify-center]="collapsed()"
            [attr.title]="collapsed() ? 'View the site' : null"
          >
            <app-icon name="external-link" [size]="17" class="shrink-0 text-ink-400" />
            @if (!collapsed()) {
              <span>View the site</span>
            }
          </a>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-red-50 hover:text-red-600"
            [class.justify-center]="collapsed()"
            [attr.title]="collapsed() ? 'Sign out' : null"
            (click)="signOut()"
          >
            <app-icon name="log-out" [size]="17" class="shrink-0 text-ink-400" />
            @if (!collapsed()) {
              <span>Sign out</span>
            }
          </button>
        </div>
      </aside>

      <!-- Mobile backdrop -->
      @if (mobileOpen()) {
        <div
          class="fixed inset-0 z-40 bg-scrim/45 backdrop-blur-sm lg:hidden"
          (click)="mobileOpen.set(false)"
        ></div>
      }

      <!-- Main -->
      <div class="transition-[padding] duration-300" [class]="collapsed() ? 'lg:pl-20' : 'lg:pl-64'">
        <!-- Top bar -->
        <header
          class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/92 px-4 backdrop-blur-lg sm:px-6"
        >
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 lg:hidden"
            aria-label="Open menu"
            (click)="mobileOpen.set(true)"
          >
            <app-icon name="menu" [size]="19" />
          </button>

          <div class="min-w-0 flex-1">
            <p class="truncate font-display text-lg">{{ pageTitle() }}</p>
          </div>

          <!-- Open / closed -->
          <span
            class="hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-micro font-bold uppercase sm:flex"
            [class]="
              status().isOpen
                ? 'border-emerald-600/25 bg-emerald-50 text-emerald-700'
                : 'border-amber-500/30 bg-amber-50 text-amber-700'
            "
          >
            <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
            {{ status().isOpen ? 'Service open' : 'Closed' }}
          </span>

          <a
            routerLink="/kitchen"
            class="hidden items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-caption font-semibold text-ink-600 transition-colors hover:border-clay-500/40 hover:text-clay-700 md:flex"
          >
            <app-icon name="flame" [size]="14" />
            Kitchen display
          </a>

          <!-- Notifications -->
          <div class="relative">
            <button
              type="button"
              class="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100"
              [attr.aria-label]="'Notifications, ' + unreadCount() + ' unread'"
              [attr.aria-expanded]="trayOpen()"
              (click)="trayOpen.set(!trayOpen())"
            >
              <app-icon name="bell" [size]="18" />
              @if (unreadCount() > 0) {
                <span
                  class="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-600 px-1 text-[0.55rem] font-extrabold text-white"
                  >{{ unreadCount() > 9 ? '9+' : unreadCount() }}</span
                >
              }
            </button>

            @if (trayOpen()) {
              <div
                class="panel absolute right-0 z-50 mt-2 w-80 overflow-hidden shadow-lux"
                style="animation: fade-up 0.2s cubic-bezier(0.22,1,0.36,1) both"
              >
                <div class="flex items-center justify-between border-b border-ink-200 px-4 py-3">
                  <p class="text-sm font-semibold text-ink-900">Notifications</p>
                  <a
                    routerLink="/admin/notifications"
                    class="text-caption font-semibold text-clay-700 hover:underline"
                    (click)="trayOpen.set(false)"
                    >See all</a
                  >
                </div>
                <ul class="max-h-96 divide-y divide-ink-200 overflow-y-auto">
                  @for (item of recentNotifications(); track item.id) {
                    <li class="px-4 py-3" [class.bg-clay-50]="!item.isRead">
                      <p class="text-sm font-medium text-ink-900">{{ item.title }}</p>
                      <p class="mt-0.5 line-clamp-2 text-caption text-ink-500">{{ item.body }}</p>
                      <p class="mt-1 text-caption text-ink-400">{{ item.createdAt | timeAgo }}</p>
                    </li>
                  } @empty {
                    <li class="px-4 py-8 text-center text-sm text-ink-500">Nothing new</li>
                  }
                </ul>
              </div>
            }
          </div>

          <!-- Account -->
          <a
            routerLink="/admin/profile"
            class="flex items-center gap-2.5 rounded-lg border border-ink-200 py-1.5 pr-3 pl-1.5 transition-colors hover:border-clay-500/40"
          >
            <span
              class="flex h-7 w-7 items-center justify-center rounded-md bg-clay-50 text-micro font-bold text-clay-700"
              >{{ auth.initials() }}</span
            >
            <span class="hidden text-left leading-tight sm:block">
              <span class="block max-w-32 truncate text-caption font-semibold text-ink-900">{{
                auth.user()?.name
              }}</span>
              <span class="block text-[0.6rem] tracking-wide text-ink-400 uppercase">{{
                auth.user()?.roleSlug
              }}</span>
            </span>
          </a>
        </header>

        <main class="p-4 sm:p-6 lg:p-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminLayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly content = inject(ContentService);
  private readonly restaurant = inject(RestaurantService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly doc = inject(DOCUMENT);

  protected readonly collapsed = signal(
    this.storage.get<boolean>(STORAGE_KEYS.adminSidebar, false),
  );
  protected readonly mobileOpen = signal(false);
  protected readonly trayOpen = signal(false);
  protected readonly status = this.restaurant.status;

  private readonly notifications = toSignal(this.content.notifications(), {
    initialValue: [] as AppNotification[],
  });
  protected readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.isRead).length,
  );
  protected readonly recentNotifications = computed(() => this.notifications().slice(0, 8));

  /** Hides sections and links the signed-in role has no permission for. */
  protected readonly visibleNav = computed(() =>
    ADMIN_NAV.map((section) => ({
      heading: section.heading,
      items: section.items.filter(
        (item: AdminNavItem) => !item.permission || this.auth.can(item.permission),
      ),
    })).filter((section) => section.items.length > 0),
  );

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly pageTitle = computed(() => {
    const url = this.currentUrl().split('?')[0];
    for (const section of ADMIN_NAV) {
      const match = section.items.find((item) =>
        item.exact ? url === item.path : url.startsWith(item.path),
      );
      if (match) return match.label;
    }
    return 'Dashboard';
  });

  protected readonly isMobile = signal(false);

  protected readonly sidebarClasses = computed(() => {
    const width = this.collapsed() ? 'w-20' : 'w-64';
    const slide = this.mobileOpen() ? 'translate-x-0' : '-translate-x-full lg:translate-x-0';
    return `${width} ${slide}`;
  });

  constructor() {
    effect(() => this.storage.set(STORAGE_KEYS.adminSidebar, this.collapsed()));

    // Close transient UI on navigation.
    effect(() => {
      this.currentUrl();
      this.mobileOpen.set(false);
      this.trayOpen.set(false);
    });

    if (typeof window !== 'undefined') {
      const query = window.matchMedia('(max-width: 1023px)');
      this.isMobile.set(query.matches);
      query.addEventListener('change', (e) => this.isMobile.set(e.matches));

      this.doc.addEventListener('click', (event) => {
        if (!this.trayOpen()) return;
        const target = event.target as HTMLElement;
        if (!target.closest('.panel') && !target.closest('[aria-label^="Notifications"]')) {
          this.trayOpen.set(false);
        }
      });
    }
  }

  protected toggleCollapse(): void {
    this.collapsed.update((v) => !v);
  }

  protected signOut(): void {
    this.auth.logout();
    this.toast.info('Signed out');
    void this.router.navigate(['/auth/login']);
  }
}
