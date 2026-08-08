import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BlogPost } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { NiceDatePipe } from '../../shared/pipes/format.pipes';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SkeletonCardComponent } from '../../shared/components/ui/feedback.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-blog-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    PageHeroComponent,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonCardComponent,
    RevealDirective,
    NiceDatePipe,
  ],
  template: `
    <app-page-hero
      eyebrow="The journal"
      title="Kitchen notes from"
      accent=" Jhangira Road"
      description="How we cook, why we cook it that way, and the occasional practical guide to feeding twenty people."
      image="assets/images/bbq/open-fire-karahi"
      imageAlt="The open karahi over a wood fire"
      [crumbs]="[{ label: 'Journal' }]"
      size="md"
    />

    <section class="section pt-14">
      <div class="container-lux">
        <!-- Toolbar -->
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
            <button
              type="button"
              class="chip shrink-0 transition-all"
              [class]="
                category() === null
                  ? 'border-clay-600/60 bg-clay-50 text-clay-700'
                  : 'border-ink-300 text-ink-500 hover:border-clay-500/40 hover:text-clay-700'
              "
              (click)="category.set(null)"
            >
              All ({{ posts().length }})
            </button>
            @for (cat of categories(); track cat) {
              <button
                type="button"
                class="chip shrink-0 transition-all"
                [class]="
                  category() === cat
                    ? 'border-clay-600/60 bg-clay-50 text-clay-700'
                    : 'border-ink-300 text-ink-500 hover:border-clay-500/40 hover:text-clay-700'
                "
                (click)="category.set(cat)"
              >
                {{ cat }}
              </button>
            }
          </div>

          <div class="relative lg:w-72">
            <app-icon
              name="search"
              [size]="16"
              class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-500"
            />
            <input
              type="search"
              class="field pl-11"
              placeholder="Search the journal"
              aria-label="Search articles"
              [(ngModel)]="search"
            />
          </div>
        </div>

        @if (!posts().length) {
          <div class="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            @for (n of [1, 2, 3]; track n) {
              <app-skeleton-card />
            }
          </div>
        } @else if (!filtered().length) {
          <app-empty-state
            class="mt-12"
            icon="pen"
            title="Nothing matches that"
            message="Try a different search or clear the category filter."
            actionLabel="Show everything"
            (action)="reset()"
          />
        } @else {
          <!-- Lead article -->
          @if (lead(); as post) {
            <article appReveal class="card-lux mt-12 grid overflow-hidden lg:grid-cols-2">
              <a
                [routerLink]="['/blog', post.slug]"
                class="relative block min-h-64 lg:min-h-[24rem]"
              >
                <app-image
                  [src]="post.coverImage"
                  [alt]="post.title"
                  [priority]="true"
                  sizes="(max-width: 1024px) 100vw, 42rem"
                  class="absolute inset-0 h-full w-full"
                />
              </a>
              <div class="flex flex-col justify-center p-8 lg:p-12">
                <div class="flex flex-wrap items-center gap-3">
                  <app-badge tone="clay">{{ post.category }}</app-badge>
                  <span class="text-caption text-ink-500"
                    >{{ post.publishedAt | niceDate }} &middot; {{ post.readMinutes }} min read</span
                  >
                </div>
                <h2 class="mt-4 text-3xl leading-tight sm:text-4xl">
                  <a [routerLink]="['/blog', post.slug]" class="transition-colors hover:text-clay-700">{{
                    post.title
                  }}</a>
                </h2>
                <p class="mt-4 leading-relaxed text-ink-600">{{ post.excerpt }}</p>
                <div class="mt-6 flex items-center gap-3">
                  <span
                    class="flex h-10 w-10 items-center justify-center rounded-full border border-clay-600/25 bg-clay-50 text-caption font-bold text-clay-700"
                    >{{ initials(post.authorName) }}</span
                  >
                  <span>
                    <span class="block text-sm font-semibold text-ink-900">{{ post.authorName }}</span>
                    <span class="block text-caption text-ink-500">{{ post.authorTitle }}</span>
                  </span>
                </div>
                <a [routerLink]="['/blog', post.slug]" class="btn btn-primary btn-md mt-7 self-start">
                  Read it
                  <app-icon name="arrow-right" [size]="15" />
                </a>
              </div>
            </article>
          }

          <!-- Rest -->
          <ul class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            @for (post of rest(); track post.id; let i = $index) {
              <li appReveal [appRevealDelay]="i * 70">
                <article class="card-lux group flex h-full flex-col overflow-hidden hover:-translate-y-1.5">
                  <a [routerLink]="['/blog', post.slug]" class="block aspect-[16/10] overflow-hidden">
                    <app-image
                      [src]="post.coverImage"
                      [alt]="post.title"
                      sizes="(max-width: 768px) 92vw, 24rem"
                      class="h-full w-full transition-transform duration-[900ms] group-hover:scale-110"
                    />
                  </a>
                  <div class="flex flex-1 flex-col p-6">
                    <div class="flex flex-wrap items-center gap-2.5">
                      <app-badge tone="outline">{{ post.category }}</app-badge>
                      <span class="text-caption text-ink-500">{{ post.readMinutes }} min</span>
                    </div>
                    <h3 class="mt-3 font-display text-xl leading-snug">
                      <a
                        [routerLink]="['/blog', post.slug]"
                        class="transition-colors hover:text-clay-700"
                        >{{ post.title }}</a
                      >
                    </h3>
                    <p class="mt-2.5 line-clamp-3 text-sm leading-relaxed text-ink-600">
                      {{ post.excerpt }}
                    </p>
                    <div
                      class="mt-auto flex items-center justify-between gap-3 border-t border-ink-200 pt-4"
                    >
                      <span class="text-caption text-ink-500">{{ post.authorName }}</span>
                      <span class="text-caption text-ink-500">{{ post.publishedAt | niceDate }}</span>
                    </div>
                  </div>
                </article>
              </li>
            }
          </ul>
        }
      </div>
    </section>
  `,
})
export class BlogPage {
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);

  protected readonly search = signal('');
  protected readonly category = signal<string | null>(null);

  protected readonly posts = toSignal(this.content.allBlogs({ isPublished: true }), {
    initialValue: [] as BlogPost[],
  });

  protected readonly categories = computed(() => [
    ...new Set(this.posts().map((p) => p.category)),
  ]);

  protected readonly filtered = computed(() => {
    const needle = this.search().trim().toLowerCase();
    const cat = this.category();
    return this.posts().filter((post) => {
      if (cat && post.category !== cat) return false;
      if (!needle) return true;
      return [post.title, post.excerpt, post.category, ...post.tags]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  });

  protected readonly lead = computed(() => this.filtered()[0]);
  protected readonly rest = computed(() => this.filtered().slice(1));

  constructor() {
    this.seo.apply({
      title: 'The Journal | Salateen Restaurant Swabi',
      description:
        'Kitchen notes from Salateen Restaurant Swabi: what makes a real Kabuli Pulao, why we still light charcoal every afternoon, how to order for a party of twenty, and the history of the chapli kabab.',
      path: 'blog',
      image: 'assets/images/bbq/open-fire-karahi.webp',
      keywords: [
        'Pakistani cooking blog',
        'Kabuli Pulao recipe notes',
        'chapli kabab history',
        'Salateen journal',
      ],
    });
    this.seo.breadcrumbSchema([{ label: 'Journal', path: 'blog' }]);
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected reset(): void {
    this.search.set('');
    this.category.set(null);
  }
}
