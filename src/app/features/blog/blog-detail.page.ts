import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { BlogPost } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { ArticleBodyPipe, NiceDatePipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { BadgeComponent, BreadcrumbsComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';

/**
 * Long-form article.
 *
 * The body is a light markdown subset rendered by `ArticleBodyPipe`, which
 * escapes all input before introducing any tags. Prose styling is applied here
 * with descendant selectors rather than a plugin, so the article inherits the
 * site's own type scale.
 */
@Component({
  selector: 'app-blog-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ImageComponent,
    IconComponent,
    BadgeComponent,
    BreadcrumbsComponent,
    EmptyStateComponent,
    SkeletonComponent,
    ArticleBodyPipe,
    NiceDatePipe,
  ],
  styles: [
    `
      .prose h2 {
        font-family: var(--font-display);
        font-size: 1.7rem;
        line-height: 1.2;
        margin-top: 2.75rem;
        margin-bottom: 0.9rem;
        color: var(--color-ink-900);
      }
      .prose p {
        margin-bottom: 1.15rem;
        line-height: 1.78;
        color: var(--color-ink-600);
      }
      .prose ul {
        margin: 0 0 1.4rem;
        padding-left: 1.15rem;
        list-style: none;
      }
      .prose li {
        position: relative;
        margin-bottom: 0.6rem;
        line-height: 1.7;
        color: var(--color-ink-600);
      }
      .prose li::before {
        content: '';
        position: absolute;
        left: -1.15rem;
        top: 0.72em;
        width: 0.4rem;
        height: 0.4rem;
        border-radius: 999px;
        background: var(--color-clay-500);
      }
      .prose strong {
        color: var(--color-ink-900);
        font-weight: 600;
      }
      .prose em {
        font-style: italic;
      }
    `,
  ],
  template: `
    @if (post(); as article) {
      <article>
        <!-- Hero -->
        <header
          class="grain-overlay relative isolate min-h-[56vh] overflow-hidden pt-[calc(var(--header-h)+3rem)]"
        >
          <app-image
            [src]="article.coverImage"
            [alt]="article.title"
            [priority]="true"
            sizes="100vw"
            class="absolute inset-0 h-full w-full"
          />
          <div class="absolute inset-0 bg-gradient-to-b from-scrim/78 via-scrim/74 to-scrim"></div>
          <div class="on-photo container-lux relative flex h-full max-w-4xl flex-col justify-end pb-14">
            <app-breadcrumbs
              [crumbs]="[{ label: 'Journal', path: '/blog' }, { label: article.title }]"
              class="mb-5"
            />
            <app-badge tone="clay">{{ article.category }}</app-badge>
            <h1 class="mt-4 text-4xl leading-[1.06] sm:text-5xl">{{ article.title }}</h1>
            <p class="mt-4 max-w-2xl text-lg text-white/80">{{ article.excerpt }}</p>

            <div class="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <span class="flex items-center gap-3">
                <span
                  class="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-caption font-bold text-white"
                  >{{ initials(article.authorName) }}</span
                >
                <span>
                  <span class="block text-sm font-semibold text-white">{{ article.authorName }}</span>
                  <span class="block text-caption text-white/65">{{ article.authorTitle }}</span>
                </span>
              </span>
              <span class="text-caption text-white/65">
                {{ article.publishedAt | niceDate }} &middot; {{ article.readMinutes }} min read
              </span>
            </div>
          </div>
        </header>

        <!-- Body -->
        <div class="section pt-14">
          <div class="container-lux grid gap-12 lg:grid-cols-12">
            <div class="lg:col-span-8">
              <div class="prose max-w-none" [innerHTML]="article.body | articleBody"></div>

              <!-- Tags -->
              @if (article.tags.length) {
                <div class="mt-12 flex flex-wrap items-center gap-2 border-t border-ink-200 pt-8">
                  <span class="text-caption text-ink-500">Filed under</span>
                  @for (tag of article.tags; track tag) {
                    <span class="chip border-ink-300 text-ink-600">{{ tag }}</span>
                  }
                </div>
              }

              <!-- Share -->
              <div class="mt-6 flex flex-wrap items-center gap-3">
                <span class="text-caption text-ink-500">Share</span>
                <button type="button" class="btn btn-secondary btn-sm" (click)="share(article)">
                  <app-icon name="copy" [size]="13" />
                  Copy link
                </button>
                <a
                  [href]="whatsappUrl(article)"
                  target="_blank"
                  rel="noopener"
                  class="btn btn-secondary btn-sm"
                >
                  <app-icon name="whatsapp" [size]="13" />
                  WhatsApp
                </a>
              </div>
            </div>

            <!-- Sidebar -->
            <aside class="lg:col-span-4">
              <div class="sticky top-[calc(var(--header-h)+1.5rem)] space-y-6">
                <div class="panel p-6">
                  <p class="eyebrow mb-4">Written by</p>
                  <div class="flex items-center gap-3">
                    <span
                      class="flex h-12 w-12 items-center justify-center rounded-full border border-clay-600/25 bg-clay-50 text-sm font-bold text-clay-700"
                      >{{ initials(article.authorName) }}</span
                    >
                    <span>
                      <span class="block font-semibold text-ink-900">{{ article.authorName }}</span>
                      <span class="block text-caption text-ink-500">{{ article.authorTitle }}</span>
                    </span>
                  </div>
                  <p class="mt-4 text-sm leading-relaxed text-ink-600">
                    Part of the team at Salateen Restaurant, Jhangira Road, Swabi.
                  </p>
                </div>

                @if (related().length) {
                  <div class="panel p-6">
                    <p class="eyebrow mb-4">Read next</p>
                    <ul class="space-y-4">
                      @for (other of related(); track other.id) {
                        <li>
                          <a [routerLink]="['/blog', other.slug]" class="group flex gap-3">
                            <span
                              class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-ink-200"
                            >
                              <app-image
                                [src]="other.coverImage"
                                [alt]="other.title"
                                sizes="64px"
                                class="h-full w-full transition-transform duration-500 group-hover:scale-110"
                              />
                            </span>
                            <span class="min-w-0">
                              <span
                                class="block text-sm leading-snug font-semibold text-ink-900 transition-colors group-hover:text-clay-700"
                                >{{ other.title }}</span
                              >
                              <span class="mt-1 block text-caption text-ink-500"
                                >{{ other.readMinutes }} min read</span
                              >
                            </span>
                          </a>
                        </li>
                      }
                    </ul>
                  </div>
                }

                <div class="panel bg-clay-50 p-6">
                  <p class="font-display text-xl">Hungry after all that?</p>
                  <p class="mt-2 text-sm leading-relaxed text-ink-600">
                    Everything in this article is on the menu tonight.
                  </p>
                  <a routerLink="/menu" class="btn btn-primary btn-md mt-4 w-full">
                    Browse the menu
                    <app-icon name="arrow-right" [size]="15" />
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </article>
    } @else if (resolved()) {
      <div class="container-lux pt-[calc(var(--header-h)+6rem)] pb-24">
        <app-empty-state
          icon="pen"
          title="We could not find that article"
          message="It may have been renamed or unpublished."
          actionLabel="Back to the journal"
          (action)="goToBlog()"
        />
      </div>
    } @else {
      <div class="container-lux space-y-5 pt-[calc(var(--header-h)+4rem)] pb-24">
        <app-skeleton height="22rem" rounded="rounded-2xl" />
        <app-skeleton height="3rem" width="70%" />
        <app-skeleton height="1rem" />
        <app-skeleton height="1rem" />
        <app-skeleton height="1rem" width="80%" />
      </div>
    }
  `,
})
export class BlogDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  private readonly resolvedPost = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const slug = params.get('slug');
        if (!slug) return of<BlogPost | null>(null);
        return this.content.blogBySlug(slug).pipe(
          map((row) => row ?? null),
          catchError(() => of<BlogPost | null>(null)),
        );
      }),
    ),
  );

  private readonly all = toSignal(this.content.allBlogs({ isPublished: true }), {
    initialValue: [] as BlogPost[],
  });

  protected readonly post = computed(() => this.resolvedPost() ?? null);
  protected readonly resolved = computed(() => this.resolvedPost() !== undefined);

  protected readonly related = computed(() => {
    const current = this.post();
    if (!current) return [];
    const sameCategory = this.all().filter(
      (p) => p.id !== current.id && p.category === current.category,
    );
    const others = this.all().filter((p) => p.id !== current.id && p.category !== current.category);
    return [...sameCategory, ...others].slice(0, 3);
  });

  constructor() {
    effect(() => {
      const article = this.post();
      if (!article) {
        // Resolved but missing: tell the SSR server to answer a real 404
        // rather than a soft one on a URL that will never have content.
        if (this.resolved()) {
          this.seo.apply({
            title: 'Not Found | Salateen Restaurant Swabi',
            description: 'That page could not be found.',
            path: 'blog',
            noIndex: true,
            statusCode: 404,
          });
        }
        return;
      }
      this.seo.apply({
        title: article.seoTitle ?? `${article.title} | Salateen Restaurant Swabi`,
        description: article.seoDescription ?? article.excerpt,
        path: `blog/${article.slug}`,
        image: `${article.coverImage}.webp`,
        type: 'article',
        publishedAt: article.publishedAt,
        modifiedAt: article.updatedAt ?? article.publishedAt,
        authorName: article.authorName,
        keywords: article.tags,
      });
      this.seo.articleSchema(article);
      this.seo.breadcrumbSchema([
        { label: 'Journal', path: 'blog' },
        { label: article.title, path: `blog/${article.slug}` },
      ]);
    });
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected whatsappUrl(article: BlogPost): string {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    return `https://wa.me/?text=${encodeURIComponent(`${article.title} ${url}`)}`;
  }

  protected share(article: BlogPost): void {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: article.title, text: article.excerpt, url });
      return;
    }
    navigator.clipboard?.writeText(url).then(
      () => this.toast.success('Link copied'),
      () => this.toast.info(url),
    );
  }

  protected goToBlog(): void {
    void this.router.navigate(['/blog']);
  }
}
