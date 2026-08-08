import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND } from '../../core/constants/app.constants';
import { MenuService } from '../../core/services/menu.service';
import { SeoService } from '../../core/services/seo.service';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { CurrencyPkrPipe } from '../../shared/pipes/currency-pkr.pipe';

/**
 * 404.
 *
 * Marked `noindex` and offers a route back: the four most-ordered dishes plus
 * the main navigation targets, rather than a dead end.
 */
@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, ImageComponent, CurrencyPkrPipe],
  template: `
    <div class="pt-[calc(var(--header-h)+4rem)] pb-24">
      <div class="container-lux">
        <div class="mx-auto max-w-2xl text-center">
          <p class="font-display text-[7rem] leading-none text-clay-600/25 sm:text-[10rem]">404</p>
          <h1 class="-mt-6 text-4xl leading-tight sm:text-5xl">
            That page is
            <span class="text-gradient-clay italic">off the menu</span>
          </h1>
          <p class="mx-auto mt-5 max-w-lg leading-relaxed text-ink-600">
            The link may be old, or we may have renamed something. Nothing is broken in the kitchen,
            which is the main thing.
          </p>

          <div class="mt-9 flex flex-wrap justify-center gap-3">
            <a routerLink="/" class="btn btn-primary btn-lg">
              <app-icon name="home" [size]="16" />
              Back to the front
            </a>
            <a routerLink="/menu" class="btn btn-secondary btn-lg">See the menu</a>
          </div>

          <div class="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            @for (link of quickLinks; track link.path) {
              <a [routerLink]="link.path" class="text-ink-500 transition-colors hover:text-clay-700">{{
                link.label
              }}</a>
            }
          </div>
        </div>

        <!-- Suggestions -->
        @if (popular().length) {
          <section class="mt-20 border-t border-ink-200 pt-14">
            <h2 class="text-center font-display text-2xl">While you are here</h2>
            <p class="mt-2 text-center text-sm text-ink-500">The four dishes people order most</p>
            <ul class="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
              @for (item of popular(); track item.id) {
                <li>
                  <a
                    [routerLink]="['/menu', item.slug]"
                    class="card-lux group flex h-full flex-col overflow-hidden hover:-translate-y-1.5"
                  >
                    <span class="block aspect-[4/3] overflow-hidden">
                      <app-image
                        [src]="item.image"
                        [alt]="item.name"
                        sizes="(max-width: 640px) 92vw, 18rem"
                        class="h-full w-full transition-transform duration-700 group-hover:scale-110"
                      />
                    </span>
                    <span class="flex flex-1 flex-col p-5">
                      <span class="font-display text-lg transition-colors group-hover:text-clay-700">{{
                        item.name
                      }}</span>
                      <span class="mt-auto pt-3 font-display text-xl text-clay-700">{{
                        item.basePrice | pkr
                      }}</span>
                    </span>
                  </a>
                </li>
              }
            </ul>
          </section>
        }

        <div class="mt-16 text-center">
          <p class="text-sm text-ink-500">
            Still stuck? Call the restaurant on
            <a [href]="'tel:' + brand.phone" class="font-semibold text-clay-700 hover:underline">{{
              brand.phoneDisplay
            }}</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundPage {
  private readonly menu = inject(MenuService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;
  protected readonly quickLinks = [
    { label: 'Book a table', path: '/reservation' },
    { label: 'Offers', path: '/offers' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'Track an order', path: '/order/track' },
    { label: 'Contact', path: '/contact' },
  ];

  protected readonly popular = computed(() => this.menu.popular().slice(0, 4));

  constructor() {
    this.seo.apply({
      title: 'Page Not Found | Salateen Restaurant Swabi',
      description: 'That page could not be found. Browse the menu or book a table instead.',
      path: '404',
      noIndex: true,
      // Makes the SSR server answer 404 instead of a soft 404.
      statusCode: 404,
    });
  }
}
