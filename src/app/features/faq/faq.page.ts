import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BRAND } from '../../core/constants/app.constants';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { AccordionComponent } from '../../shared/components/ui/navigation.components';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-faq-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    PageHeroComponent,
    IconComponent,
    AccordionComponent,
    EmptyStateComponent,
    SkeletonComponent,
    RevealDirective,
  ],
  template: `
    <app-page-hero
      eyebrow="Questions"
      title="Everything people"
      accent=" ask us"
      description="Delivery areas, minimum orders, the family hall, whether we take cards. Answered properly."
      image="assets/images/interior/dining-seating"
      imageAlt="Tables laid before service at Salateen Restaurant"
      [crumbs]="[{ label: 'FAQ' }]"
      size="sm"
    />

    <section class="section pt-14">
      <div class="container-lux grid gap-10 lg:grid-cols-12">
        <!-- Category rail -->
        <aside class="lg:col-span-3">
          <div class="sticky top-[calc(var(--header-h)+1.5rem)]">
            <div class="relative">
              <app-icon
                name="search"
                [size]="16"
                class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-500"
              />
              <input
                type="search"
                class="field pl-11"
                placeholder="Search questions"
                aria-label="Search frequently asked questions"
                [(ngModel)]="search"
              />
            </div>

            <nav class="mt-5" aria-label="FAQ categories">
              <button
                type="button"
                class="block w-full rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold transition-colors"
                [class]="
                  category() === null
                    ? 'bg-clay-50 text-clay-700'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                "
                (click)="category.set(null)"
              >
                All questions
                <span class="ml-1.5 text-caption text-ink-500">{{ faqs().length }}</span>
              </button>
              @for (cat of categories(); track cat) {
                <button
                  type="button"
                  class="block w-full rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold transition-colors"
                  [class]="
                    category() === cat
                      ? 'bg-clay-50 text-clay-700'
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                  "
                  (click)="category.set(cat)"
                >
                  {{ cat }}
                  <span class="ml-1.5 text-caption text-ink-500">{{ countFor(cat) }}</span>
                </button>
              }
            </nav>

            <div class="panel mt-6 p-5">
              <p class="text-sm font-semibold text-ink-900">Still not answered?</p>
              <p class="mt-1.5 text-caption leading-relaxed text-ink-500">
                Call the restaurant. Someone who actually works here will pick up.
              </p>
              <a [href]="'tel:' + brand.phone" class="btn btn-primary btn-sm mt-4 w-full">
                <app-icon name="phone" [size]="13" />
                {{ brand.phoneDisplay }}
              </a>
              <a routerLink="/contact" class="btn btn-ghost btn-sm mt-2 w-full border border-ink-300"
                >Send a message</a
              >
            </div>
          </div>
        </aside>

        <!-- Questions -->
        <div class="lg:col-span-9">
          @if (!faqs().length) {
            <div class="space-y-4">
              @for (n of [1, 2, 3, 4, 5, 6]; track n) {
                <app-skeleton height="4rem" />
              }
            </div>
          } @else if (!grouped().length) {
            <app-empty-state
              icon="help"
              title="No questions match that"
              message="Try a different search, or call us and ask directly."
              actionLabel="Clear search"
              (action)="reset()"
            />
          } @else {
            @for (group of grouped(); track group.category; let g = $index) {
              <section appReveal [appRevealDelay]="g * 60" class="mb-10">
                <h2 class="font-display text-2xl">{{ group.category }}</h2>
                <div class="rule-clay mt-3 w-20"></div>
                <app-accordion class="mt-2" [items]="group.items" [initialOpen]="g === 0 ? group.items[0].id : null" />
              </section>
            }
          }
        </div>
      </div>
    </section>
  `,
})
export class FaqPage {
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;
  protected readonly search = signal('');
  protected readonly category = signal<string | null>(null);

  protected readonly faqs = computed(() => this.content.faqs());

  protected readonly categories = computed(() => [...new Set(this.faqs().map((f) => f.category))]);

  private readonly filtered = computed(() => {
    const needle = this.search().trim().toLowerCase();
    const cat = this.category();
    return this.faqs().filter((faq) => {
      if (cat && faq.category !== cat) return false;
      if (!needle) return true;
      return `${faq.question} ${faq.answer}`.toLowerCase().includes(needle);
    });
  });

  protected readonly grouped = computed(() => {
    const map = new Map<string, { id: string; question: string; answer: string }[]>();
    for (const faq of this.filtered()) {
      const list = map.get(faq.category) ?? [];
      list.push({ id: faq.id, question: faq.question, answer: faq.answer });
      map.set(faq.category, list);
    }
    return [...map.entries()].map(([category, items]) => ({ category, items }));
  });

  constructor() {
    this.seo.apply({
      title: 'Frequently Asked Questions | Salateen Restaurant Swabi',
      description:
        'Answers about delivery areas and charges, minimum orders, booking the family hall, halal sourcing, vegetarian options, catering and payment at Salateen Restaurant Swabi.',
      path: 'faq',
      image: 'assets/images/interior/dining-seating.webp',
      keywords: ['Salateen FAQ', 'Swabi restaurant delivery', 'family hall booking', 'halal Swabi'],
    });
    this.seo.breadcrumbSchema([{ label: 'FAQ', path: 'faq' }]);

    // FAQPage schema, but only for the unfiltered set so crawlers see it all.
    effect(() => {
      const all = this.faqs();
      if (all.length) {
        this.seo.faqSchema(all.map((f) => ({ question: f.question, answer: f.answer })));
      }
    });
  }

  protected countFor(category: string): number {
    return this.faqs().filter((f) => f.category === category).length;
  }

  protected reset(): void {
    this.search.set('');
    this.category.set(null);
  }
}
