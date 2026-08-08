import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GalleryCategory, GalleryImage } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';

const FILTERS: { value: GalleryCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'food', label: 'The food' },
  { value: 'bbq', label: 'The coals' },
  { value: 'interior', label: 'Inside' },
  { value: 'exterior', label: 'Outside' },
  { value: 'ambience', label: 'Guests' },
  { value: 'brand', label: 'The card' },
];

/**
 * Photo gallery with a lightbox.
 *
 * Every image is a real photograph of the restaurant, so the copy says so;
 * that claim is worth making on a site where stock food photography is the norm.
 */
@Component({
  selector: 'app-gallery-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeroComponent,
    ImageComponent,
    IconComponent,
    EmptyStateComponent,
    SkeletonComponent,
    RevealDirective,
  ],
  host: {
    '(document:keydown.escape)': 'close()',
    '(document:keydown.arrowright)': 'next()',
    '(document:keydown.arrowleft)': 'previous()',
  },
  template: `
    <app-page-hero
      eyebrow="Gallery"
      title="Every photograph here"
      accent=" was taken inside"
      description="No stock imagery. The room, the fire, the trays and the guests, exactly as they are."
      image="assets/images/interior/tiled-corridor"
      imageAlt="The tiled corridor between the main hall and the family wing"
      [crumbs]="[{ label: 'Gallery' }]"
      size="md"
    />

    <section class="section pt-12">
      <div class="container-lux">
        <!-- Filters -->
        <div class="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          @for (filter of filters; track filter.value) {
            <button
              type="button"
              class="chip shrink-0 transition-all"
              [class]="
                active() === filter.value
                  ? 'border-clay-600/60 bg-clay-50 text-clay-700'
                  : 'border-ink-300 text-ink-500 hover:border-clay-500/40 hover:text-clay-700'
              "
              [attr.aria-pressed]="active() === filter.value"
              (click)="active.set(filter.value)"
            >
              {{ filter.label }}
              <span class="opacity-60">{{ countFor(filter.value) }}</span>
            </button>
          }
        </div>

        <!-- Mosaic -->
        @if (!images().length) {
          <div class="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            @for (n of [1, 2, 3, 4, 5, 6, 7, 8]; track n) {
              <app-skeleton height="14rem" rounded="rounded-xl" />
            }
          </div>
        } @else if (!visible().length) {
          <app-empty-state
            class="mt-10"
            icon="image"
            title="Nothing in this set"
            message="Try another filter."
            actionLabel="Show everything"
            (action)="active.set('all')"
          />
        } @else {
          <ul class="mt-10 columns-2 gap-4 md:columns-3 lg:columns-4 [&>li]:mb-4">
            @for (image of visible(); track image.id; let i = $index) {
              <li appReveal [appRevealDelay]="(i % 8) * 50" class="break-inside-avoid">
                <button
                  type="button"
                  class="group relative block w-full overflow-hidden rounded-xl border border-ink-200"
                  [attr.aria-label]="'View ' + image.title + ' full size'"
                  (click)="open(i)"
                >
                  <app-image
                    [src]="image.image"
                    [alt]="image.title"
                    sizes="(max-width: 768px) 45vw, 22rem"
                    [class]="aspectFor(i)"
                    class="w-full transition-transform duration-700 group-hover:scale-105"
                  />
                  <span
                    class="absolute inset-0 bg-gradient-to-t from-scrim/85 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  ></span>
                  <span
                    class="absolute right-3 bottom-3 left-3 translate-y-2 text-left text-xs font-semibold text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
                  >
                    {{ image.title }}
                  </span>
                  <span
                    class="absolute top-3 right-3 flex h-8 w-8 scale-75 items-center justify-center rounded-full bg-white/90 text-ink-900 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100"
                  >
                    <app-icon name="search" [size]="15" />
                  </span>
                </button>
              </li>
            }
          </ul>

          <p class="mt-10 text-center text-sm text-ink-500">
            Showing {{ visible().length }} of {{ images().length }} photographs
          </p>
        }
      </div>
    </section>

    <!-- Lightbox -->
    @if (lightboxIndex() !== null) {
      <div
        class="fixed inset-0 z-[var(--z-lightbox)] flex items-center justify-center bg-scrim/95 p-4 backdrop-blur-sm"
        style="animation: fade-in 0.2s ease-out both"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="current()?.title"
        (click)="close()"
      >
        <button
          type="button"
          class="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="Close"
          (click)="close(); $event.stopPropagation()"
        >
          <app-icon name="close" [size]="20" />
        </button>

        <button
          type="button"
          class="absolute left-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
          aria-label="Previous photograph"
          (click)="previous(); $event.stopPropagation()"
        >
          <app-icon name="chevron-left" [size]="22" />
        </button>
        <button
          type="button"
          class="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
          aria-label="Next photograph"
          (click)="next(); $event.stopPropagation()"
        >
          <app-icon name="chevron-right" [size]="22" />
        </button>

        @if (current(); as image) {
          <figure class="max-h-full w-full max-w-5xl" (click)="$event.stopPropagation()">
            <app-image
              [src]="image.image"
              [alt]="image.title"
              [priority]="true"
              sizes="100vw"
              objectFit="object-contain"
              class="max-h-[75vh] w-full"
            />
            <figcaption class="mt-4 text-center">
              <p class="font-display text-xl text-white">{{ image.title }}</p>
              <p class="mt-1 text-sm text-white/70">{{ image.caption }}</p>
              <p class="mt-2 text-caption text-white/45">
                {{ (lightboxIndex() ?? 0) + 1 }} of {{ visible().length }}
              </p>
            </figcaption>
          </figure>
        }
      </div>
    }
  `,
})
export class GalleryPage {
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);

  protected readonly filters = FILTERS;
  protected readonly active = signal<GalleryCategory | 'all'>('all');
  protected readonly lightboxIndex = signal<number | null>(null);

  protected readonly images = computed(() => this.content.gallery());

  protected readonly visible = computed<GalleryImage[]>(() => {
    const filter = this.active();
    const all = this.images();
    return filter === 'all' ? all : all.filter((i) => i.category === filter);
  });

  protected readonly current = computed(() => {
    const index = this.lightboxIndex();
    return index === null ? null : (this.visible()[index] ?? null);
  });

  constructor() {
    this.seo.apply({
      title: 'Gallery | Salateen Restaurant Swabi',
      description:
        'Photographs of Salateen Restaurant Swabi: the blue-tiled halls, the charcoal pits, the Kabuli Pulao trays and the guests. Every image taken inside the restaurant.',
      path: 'gallery',
      image: 'assets/images/interior/tiled-corridor.webp',
      keywords: ['Salateen Restaurant photos', 'Swabi restaurant gallery', 'BBQ photos Swabi'],
    });
    this.seo.breadcrumbSchema([{ label: 'Gallery', path: 'gallery' }]);
  }

  protected countFor(value: GalleryCategory | 'all'): number {
    return value === 'all'
      ? this.images().length
      : this.images().filter((i) => i.category === value).length;
  }

  /** Varies tile height so the masonry columns do not read as a plain grid. */
  protected aspectFor(index: number): string {
    return ['aspect-[4/5]', 'aspect-square', 'aspect-[4/3]', 'aspect-[3/4]'][index % 4];
  }

  protected open(index: number): void {
    this.lightboxIndex.set(index);
  }

  protected close(): void {
    this.lightboxIndex.set(null);
  }

  protected next(): void {
    const index = this.lightboxIndex();
    if (index === null) return;
    this.lightboxIndex.set((index + 1) % this.visible().length);
  }

  protected previous(): void {
    const index = this.lightboxIndex();
    if (index === null) return;
    const total = this.visible().length;
    this.lightboxIndex.set((index - 1 + total) % total);
  }
}
