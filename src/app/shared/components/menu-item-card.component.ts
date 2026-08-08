import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuItem } from '../../core/models/menu.model';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPkrPipe } from '../pipes/currency-pkr.pipe';
import { BadgeComponent, RatingComponent, SpiceMeterComponent } from './ui/display.components';
import { IconComponent } from './ui/icon.component';
import { ImageComponent } from './ui/image.component';

/**
 * The menu tile used on the home page, the menu grid, related items and the
 * wishlist. Quick-add drops the default variant straight into the basket; any
 * customisation happens on the detail page.
 */
@Component({
  selector: 'app-menu-item-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    RatingComponent,
    SpiceMeterComponent,
    CurrencyPkrPipe,
  ],
  host: { class: 'block h-full' },
  template: `
    <article
      class="card-lux group flex h-full flex-col overflow-hidden hover:-translate-y-1.5 hover:border-clay-500/35 hover:shadow-lux"
      [class.opacity-60]="!item().isAvailable"
    >
      <a
        [routerLink]="['/menu', item().slug]"
        class="relative block aspect-[4/3] overflow-hidden"
        [attr.aria-label]="'View ' + item().name"
      >
        <app-image
          [src]="item().image"
          [alt]="item().name + ' at Salateen Restaurant Swabi'"
          [sizes]="'(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 24rem'"
          class="h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-scrim/85 via-scrim/10 to-transparent"
          aria-hidden="true"
        ></div>

        <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
          @if (!item().isAvailable) {
            <app-badge tone="red">Sold out today</app-badge>
          } @else if (item().isChefRecommended) {
            <app-badge tone="clay" icon="chef">Chef&rsquo;s pick</app-badge>
          } @else if (item().isNew) {
            <app-badge tone="basil" icon="sparkle">New</app-badge>
          } @else if (item().isPopular) {
            <app-badge tone="turmeric" icon="flame">Popular</app-badge>
          }
          @if (discountPercent(); as pct) {
            <app-badge tone="emerald">-{{ pct }}%</app-badge>
          }
        </div>

        @if (showFavourite()) {
          <button
            type="button"
            class="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-ink-200/70 bg-white/60 text-ink-700 backdrop-blur-md transition-all hover:border-clay-500/50 hover:text-clay-700"
            [class.text-clay-700]="isFavourite()"
            [attr.aria-label]="(isFavourite() ? 'Remove ' : 'Add ') + item().name + ' to favourites'"
            [attr.aria-pressed]="isFavourite()"
            (click)="onFavourite($event)"
          >
            <app-icon name="heart" [size]="16" [strokeWidth]="isFavourite() ? 2.4 : 1.7" />
          </button>
        }

        <div class="absolute right-3 bottom-3 left-3 flex items-end justify-between gap-3">
          <app-rating class="on-photo" [value]="item().rating" [count]="item().ratingCount" [size]="13" />
          <span
            class="flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-caption font-semibold text-ink-800 backdrop-blur-md"
          >
            <app-icon name="clock" [size]="11" />
            {{ item().prepTimeMinutes }} min
          </span>
        </div>
      </a>

      <div class="flex flex-1 flex-col p-5">
        <div class="flex items-start justify-between gap-3">
          <h3 class="font-display text-xl leading-tight text-ink-900">
            <a
              [routerLink]="['/menu', item().slug]"
              class="transition-colors hover:text-clay-700 focus-visible:text-clay-700"
              >{{ item().name }}</a
            >
          </h3>
          @if (item().nameUrdu) {
            <span class="shrink-0 pt-1 font-display text-base text-ink-500" dir="rtl" lang="ur">{{
              item().nameUrdu
            }}</span>
          }
        </div>

        <p class="mt-2 line-clamp-2 text-body-sm leading-relaxed text-ink-600">
          {{ item().shortDescription }}
        </p>

        <div class="mt-3 flex flex-wrap items-center gap-3">
          <app-spice-meter [level]="item().spiceLevel" />
          @if (variantHint(); as hint) {
            <span class="text-micro tracking-wide text-ink-500 uppercase">{{ hint }}</span>
          }
        </div>

        <div class="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p class="text-micro tracking-[0.16em] text-ink-500 uppercase">From</p>
            <p class="flex items-baseline gap-2">
              <span class="font-display text-2xl leading-none text-clay-700">{{
                item().basePrice | pkr
              }}</span>
              @if (item().compareAtPrice) {
                <span class="text-sm text-ink-500 line-through">{{
                  item().compareAtPrice! | pkr
                }}</span>
              }
            </p>
          </div>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            [disabled]="!item().isAvailable"
            [attr.aria-label]="'Add ' + item().name + ' to your order'"
            (click)="quickAdd()"
          >
            <app-icon name="plus" [size]="14" [strokeWidth]="2.4" />
            Add
          </button>
        </div>
      </div>
    </article>
  `,
})
export class MenuItemCardComponent {
  readonly item = input.required<MenuItem>();
  readonly showFavourite = input(false);
  readonly isFavourite = input(false);
  readonly favouriteToggled = output<MenuItem>();

  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);

  protected readonly discountPercent = computed(() => {
    const item = this.item();
    if (!item.compareAtPrice || item.compareAtPrice <= item.basePrice) return null;
    return Math.round(((item.compareAtPrice - item.basePrice) / item.compareAtPrice) * 100);
  });

  /** "Half / Full kilo" or "Serves 10", whichever the variants imply. */
  protected readonly variantHint = computed(() => {
    const variants = this.item().variants;
    if (variants.length > 1) return `${variants.length} sizes`;
    const only = variants[0];
    return only && only.serves > 1 ? `Serves ${only.serves}` : '';
  });

  protected quickAdd(): void {
    const item = this.item();
    const variant = item.variants.find((v) => v.isDefault) ?? item.variants[0];
    if (!variant) return;

    this.cart.add({ item, variant, quantity: 1 });
    this.toast.push(
      'success',
      `${item.name} added`,
      `${variant.label} added to your order.`,
      3500,
      { label: 'View basket', run: () => this.cart.open() },
    );
  }

  protected onFavourite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favouriteToggled.emit(this.item());
  }
}
