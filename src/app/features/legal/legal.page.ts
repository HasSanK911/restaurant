import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { BRAND } from '../../core/constants/app.constants';
import { SeoService } from '../../core/services/seo.service';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { LEGAL_DOCUMENTS, LegalDocument } from './legal.content';

/**
 * Serves all three legal documents.
 *
 * The route's `data.doc` picks which one, so privacy, terms and refunds stay
 * consistent in structure and there is one place to restyle them.
 */
@Component({
  selector: 'app-legal-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeroComponent, IconComponent],
  template: `
    @if (doc(); as document) {
      <app-page-hero
        [eyebrow]="document.eyebrow"
        [title]="document.title"
        [accent]="document.accent"
        [description]="document.summary"
        [image]="document.image"
        [imageAlt]="document.title + document.accent"
        [crumbs]="[{ label: document.title + document.accent }]"
        size="sm"
      />

      <section class="section pt-14">
        <div class="container-lux grid gap-10 lg:grid-cols-12">
          <!-- Contents rail -->
          <aside class="lg:col-span-3">
            <nav class="sticky top-[calc(var(--header-h)+1.5rem)]" aria-label="On this page">
              <p class="eyebrow mb-4">On this page</p>
              <ul class="space-y-1.5">
                @for (section of document.sections; track section.heading) {
                  <li>
                    <a
                      [href]="'#' + anchor(section.heading)"
                      class="block rounded-lg px-3 py-2 text-sm text-ink-600 transition-colors hover:bg-ink-100 hover:text-clay-700"
                      >{{ section.heading }}</a
                    >
                  </li>
                }
              </ul>

              <div class="panel mt-6 p-5">
                <p class="text-caption text-ink-500">Last updated</p>
                <p class="mt-1 text-sm font-semibold text-ink-900">{{ document.updated }}</p>
                <div class="mt-4 space-y-1.5">
                  @for (other of others(); track other.key) {
                    <a
                      [routerLink]="'/' + other.path"
                      class="block text-caption text-clay-700 hover:underline"
                      >{{ other.title }}{{ other.accent }}</a
                    >
                  }
                </div>
              </div>
            </nav>
          </aside>

          <!-- Body -->
          <div class="lg:col-span-9">
            @for (section of document.sections; track section.heading) {
              <section [id]="anchor(section.heading)" class="mb-11 scroll-mt-28">
                <h2 class="font-display text-2xl">{{ section.heading }}</h2>
                <div class="rule-clay mt-3 w-16"></div>

                @if (section.paragraphs) {
                  @for (paragraph of section.paragraphs; track paragraph) {
                    <p class="mt-4 leading-relaxed text-ink-600">{{ paragraph }}</p>
                  }
                }

                @if (section.bullets) {
                  <ul class="mt-4 space-y-2.5">
                    @for (bullet of section.bullets; track bullet) {
                      <li class="flex items-start gap-3 leading-relaxed text-ink-600">
                        <span
                          class="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500"
                          aria-hidden="true"
                        ></span>
                        {{ bullet }}
                      </li>
                    }
                  </ul>
                }
              </section>
            }

            <!-- Fraud warning: worth repeating on every legal page -->
            <div class="rounded-2xl border border-amber-500/35 bg-amber-50 p-6">
              <p class="flex items-center gap-2 font-semibold text-amber-800">
                <app-icon name="shield" [size]="18" />
                We never ask for payment online
              </p>
              <p class="mt-2 text-sm leading-relaxed text-ink-700">
                Salateen Restaurant takes cash only. We will never ask you for card details, bank
                details, an OTP or a transfer, on this website or over the phone. If someone does,
                it is not us. Call
                <a [href]="'tel:' + brand.phone" class="font-semibold text-clay-700 hover:underline">{{
                  brand.phoneDisplay
                }}</a>
                and tell us.
              </p>
            </div>

            <p class="mt-8 text-caption leading-relaxed text-ink-500">
              This document is written in plain language and in good faith. It is not legal advice.
              If anything here conflicts with your rights under Pakistani law, your rights prevail.
            </p>
          </div>
        </div>
      </section>
    }
  `,
})
export class LegalPage {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;

  private readonly key = toSignal(
    this.route.data.pipe(map((data) => (data['doc'] as LegalDocument['key']) ?? 'privacy')),
    { initialValue: 'privacy' as LegalDocument['key'] },
  );

  protected readonly doc = computed(() => LEGAL_DOCUMENTS[this.key()]);

  protected readonly others = computed(() =>
    Object.values(LEGAL_DOCUMENTS).filter((d) => d.key !== this.key()),
  );

  constructor() {
    effect(() => {
      const document = this.doc();
      this.seo.apply({
        title: `${document.title}${document.accent} | Salateen Restaurant Swabi`,
        description: document.summary,
        path: document.path,
        image: `${document.image}.webp`,
      });
      this.seo.breadcrumbSchema([
        { label: `${document.title}${document.accent}`, path: document.path },
      ]);
    });
  }

  protected anchor(heading: string): string {
    return heading
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
