import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { Review } from '../../core/models/content.model';
import { AuthService } from '../../core/services/auth.service';
import { ContentService } from '../../core/services/content.service';
import { MenuService } from '../../core/services/menu.service';
import { SeoService } from '../../core/services/seo.service';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent, RatingComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent } from '../../shared/components/ui/feedback.components';

@Component({
  selector: 'app-account-reviews-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    RatingComponent,
    EmptyStateComponent,
    NiceDatePipe,
  ],
  template: `
    <h2 class="font-display text-2xl">My reviews</h2>
    <p class="mt-1.5 text-sm text-ink-600">
      What you have written about individual dishes, and any reply from the restaurant.
    </p>

    @if (reviews().length) {
      <ul class="mt-7 space-y-4">
        @for (review of reviews(); track review.id) {
          <li>
            <article class="panel p-5">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="flex min-w-0 items-center gap-3">
                  @if (dishFor(review); as dish) {
                    <a
                      [routerLink]="['/menu', dish.slug]"
                      class="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-ink-200"
                    >
                      <app-image [src]="dish.image" [alt]="dish.name" sizes="48px" class="h-full w-full" />
                    </a>
                    <div class="min-w-0">
                      <a
                        [routerLink]="['/menu', dish.slug]"
                        class="block truncate font-semibold text-ink-900 transition-colors hover:text-clay-700"
                        >{{ dish.name }}</a
                      >
                      <p class="text-caption text-ink-500">{{ review.createdAt | niceDate }}</p>
                    </div>
                  } @else {
                    <div>
                      <p class="font-semibold text-ink-900">General review</p>
                      <p class="text-caption text-ink-500">{{ review.createdAt | niceDate }}</p>
                    </div>
                  }
                </div>
                <div class="flex items-center gap-3">
                  <app-rating [value]="review.rating" [size]="14" />
                  <app-badge [tone]="review.isApproved ? 'emerald' : 'amber'">
                    {{ review.isApproved ? 'Published' : 'Awaiting review' }}
                  </app-badge>
                </div>
              </div>

              <p class="mt-4 font-display text-lg">{{ review.title }}</p>
              <p class="mt-1.5 text-sm leading-relaxed text-ink-600">{{ review.body }}</p>

              @if (review.reply) {
                <div class="mt-4 rounded-lg border-l-2 border-clay-500/60 bg-ink-50 p-4">
                  <p class="flex items-center gap-1.5 text-micro font-bold text-clay-700 uppercase">
                    <app-icon name="quote" [size]="11" />
                    Salateen replied
                  </p>
                  <p class="mt-1.5 text-sm leading-relaxed text-ink-600">{{ review.reply }}</p>
                  @if (review.repliedAt) {
                    <p class="mt-1.5 text-caption text-ink-400">{{ review.repliedAt | niceDate }}</p>
                  }
                </div>
              }

              @if (review.helpfulCount > 0) {
                <p class="mt-3 flex items-center gap-1.5 text-caption text-ink-500">
                  <app-icon name="check-circle" [size]="12" />
                  {{ review.helpfulCount }} people found this helpful
                </p>
              }
            </article>
          </li>
        }
      </ul>
    } @else {
      <app-empty-state
        class="mt-7"
        icon="star"
        title="You have not written a review yet"
        message="After your next order, tell us what you thought. Honest criticism reaches the kitchen faster than praise."
        actionLabel="See your orders"
        (action)="goToOrders()"
      />
    }
  `,
})
export class AccountReviewsPage {
  private readonly auth = inject(AuthService);
  private readonly content = inject(ContentService);
  private readonly menu = inject(MenuService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  private readonly userId = computed(() => this.auth.user()?.id ?? null);

  protected readonly reviews = toSignal(
    toObservable(this.userId).pipe(
      switchMap((id) => (id ? this.content.reviews({ customerId: id }) : of<Review[]>([]))),
    ),
    { initialValue: [] as Review[] },
  );

  constructor() {
    this.seo.apply({
      title: 'My Reviews | Salateen Restaurant Swabi',
      description: 'Reviews you have written for Salateen Restaurant dishes.',
      path: 'account/reviews',
      noIndex: true,
    });
  }

  protected dishFor(review: Review) {
    return review.menuItemId
      ? this.menu.items().find((item) => item.id === review.menuItemId)
      : undefined;
  }

  protected goToOrders(): void {
    void this.router.navigate(['/account/orders']);
  }
}
