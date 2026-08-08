import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MOBILE_TAB_NAV } from '../../core/constants/navigation.constants';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent, IconName } from '../../shared/components/ui/icon.component';

/**
 * Thumb-reach bottom navigation for phones.
 *
 * Padded for the iOS home indicator via `env(safe-area-inset-bottom)`. The
 * body carries matching bottom padding (see the public layout) so the bar never
 * covers the last row of content.
 */
@Component({
  selector: 'app-mobile-tab-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <nav
      class="glass-strong fixed inset-x-0 bottom-0 z-[var(--z-nav)] border-t border-clay-500/12 pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Quick navigation"
    >
      <ul class="flex items-stretch">
        @for (tab of tabs; track tab.path) {
          <li class="flex-1">
            <a
              [routerLink]="accountAwarePath(tab.path)"
              routerLinkActive="text-clay-700"
              #rla="routerLinkActive"
              [routerLinkActiveOptions]="{ exact: !!tab.exact }"
              class="relative flex flex-col items-center gap-1 py-2.5 text-ink-500 transition-colors"
              [attr.aria-current]="rla.isActive ? 'page' : null"
            >
              @if (rla.isActive) {
                <span
                  class="absolute inset-x-6 top-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-clay-400 to-transparent"
                  aria-hidden="true"
                ></span>
              }
              <span class="relative">
                <app-icon [name]="$any(tab.icon)" [size]="21" [strokeWidth]="rla.isActive ? 2 : 1.6" />
                @if (tab.path === '/cart' && cartCount() > 0) {
                  <span
                    class="absolute -top-1.5 -right-2 flex h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full bg-gradient-to-br from-clay-300 to-clay-600 px-1 text-caption leading-none font-extrabold text-white"
                    >{{ cartCount() > 9 ? '9+' : cartCount() }}</span
                  >
                }
              </span>
              <span class="text-caption font-semibold tracking-wide">{{ tab.label }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class MobileTabBarComponent {
  private readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);

  protected readonly tabs = MOBILE_TAB_NAV as { label: string; path: string; icon: IconName; exact?: boolean }[];
  protected readonly cartCount = this.cart.itemCount;

  /** Signed-out taps on Account land on login rather than a guard bounce. */
  protected accountAwarePath(path: string): string {
    if (path !== '/account') return path;
    if (!this.auth.isAuthenticated()) return '/auth/login';
    return this.auth.isAdminSide() ? '/admin' : '/account';
  }
}
