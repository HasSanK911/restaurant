import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { MenuService } from '../../core/services/menu.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { MenuItemCardComponent } from '../../shared/components/menu-item-card.component';
import { EmptyStateComponent } from '../../shared/components/ui/feedback.components';

@Component({
  selector: 'app-account-wishlist-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MenuItemCardComponent, EmptyStateComponent],
  template: `
    <h2 class="font-display text-2xl">Wishlist</h2>
    <p class="mt-1.5 text-sm text-ink-600">
      Dishes you have saved. Tap the heart on any dish to add it here.
    </p>

    @if (items().length) {
      <ul class="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        @for (item of items(); track item.id) {
          <li>
            <app-menu-item-card
              [item]="item"
              [showFavourite]="true"
              [isFavourite]="true"
              (favouriteToggled)="remove($event.id)"
            />
          </li>
        }
      </ul>
    } @else {
      <app-empty-state
        class="mt-7"
        icon="heart"
        title="Nothing saved yet"
        message="Tap the heart on any dish and it will wait for you here."
        actionLabel="Browse the menu"
        (action)="goToMenu()"
      />
    }
  `,
})
export class AccountWishlistPage {
  private readonly auth = inject(AuthService);
  private readonly menu = inject(MenuService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  private readonly reload = signal(0);

  private readonly record = toSignal(
    toObservable(computed(() => `${this.auth.user()?.id}:${this.reload()}`)).pipe(
      switchMap(() => this.auth.currentUserRecord()),
    ),
    { initialValue: null as User | null },
  );

  protected readonly items = computed(() => {
    const ids = this.record()?.favouriteItemIds ?? [];
    return this.menu.itemsByIds(ids);
  });

  constructor() {
    this.seo.apply({
      title: 'Wishlist | Salateen Restaurant Swabi',
      description: 'Dishes you have saved at Salateen Restaurant.',
      path: 'account/wishlist',
      noIndex: true,
    });
  }

  protected remove(id: string): void {
    this.auth.toggleFavourite(id).subscribe(() => {
      this.toast.info('Removed from your wishlist');
      this.reload.update((n) => n + 1);
    });
  }

  protected goToMenu(): void {
    void this.router.navigate(['/menu']);
  }
}
