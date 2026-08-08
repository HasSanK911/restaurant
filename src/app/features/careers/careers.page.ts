import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BRAND } from '../../core/constants/app.constants';
import { JobOpening } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { HumanisePipe } from '../../shared/pipes/format.pipes';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent, IconName } from '../../shared/components/ui/icon.component';
import { BadgeComponent, SectionHeaderComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-careers-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeroComponent,
    IconComponent,
    BadgeComponent,
    SectionHeaderComponent,
    EmptyStateComponent,
    SkeletonComponent,
    RevealDirective,
    HumanisePipe,
  ],
  template: `
    <app-page-hero
      eyebrow="Careers"
      title="Work where the"
      accent=" coals are lit at four"
      description="A kitchen that cooks everything to order needs people who care about that. If that is you, we would like to hear from you."
      image="assets/images/bbq/chef-grilling"
      imageAlt="A chef turning skewers over charcoal"
      [crumbs]="[{ label: 'Careers' }]"
      size="md"
    />

    <!-- Why work here -->
    <section class="section">
      <div class="container-lux">
        <app-section-header
          appReveal
          eyebrow="Why here"
          title="What we offer"
          accent=" beyond the salary"
        />
        <ul class="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          @for (benefit of benefits; track benefit.title; let i = $index) {
            <li appReveal [appRevealDelay]="i * 80">
              <div class="card-lux h-full p-6">
                <span
                  class="flex h-11 w-11 items-center justify-center rounded-xl border border-clay-600/20 bg-clay-50 text-clay-700"
                >
                  <app-icon [name]="benefit.icon" [size]="19" />
                </span>
                <h3 class="mt-4 font-display text-lg">{{ benefit.title }}</h3>
                <p class="mt-2 text-sm leading-relaxed text-ink-600">{{ benefit.body }}</p>
              </div>
            </li>
          }
        </ul>
      </div>
    </section>

    <!-- Openings -->
    <section class="section border-y border-ink-200 bg-ink-50">
      <div class="container-lux">
        <app-section-header
          appReveal
          eyebrow="Open roles"
          title="Positions we are"
          accent=" hiring for"
          [description]="openCount() + ' role' + (openCount() === 1 ? '' : 's') + ' open right now, all at the Swabi kitchen.'"
        />

        @if (!jobs().length) {
          <div class="mt-12 space-y-4">
            @for (n of [1, 2, 3]; track n) {
              <app-skeleton height="8rem" rounded="rounded-2xl" />
            }
          </div>
        } @else if (!open().length) {
          <app-empty-state
            class="mt-12"
            icon="badge"
            title="No openings at the moment"
            message="Drop a CV at the counter anyway. We keep them and call when something comes up."
          />
        } @else {
          <ul class="mt-14 space-y-4">
            @for (job of open(); track job.id; let i = $index) {
              <li appReveal [appRevealDelay]="i * 60">
                <a
                  [routerLink]="['/careers', job.slug]"
                  class="card-lux group flex flex-col gap-5 p-6 transition-all hover:-translate-y-1 hover:border-clay-500/40 sm:flex-row sm:items-center"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2.5">
                      <app-badge tone="clay">{{ job.department }}</app-badge>
                      <app-badge tone="outline">{{ job.type | humanise }}</app-badge>
                    </div>
                    <h3
                      class="mt-3 font-display text-2xl transition-colors group-hover:text-clay-700"
                    >
                      {{ job.title }}
                    </h3>
                    <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-600">
                      {{ job.description }}
                    </p>
                    <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-ink-500">
                      <span class="flex items-center gap-1.5">
                        <app-icon name="map" [size]="13" />
                        {{ job.location }}
                      </span>
                      <span class="flex items-center gap-1.5">
                        <app-icon name="badge" [size]="13" />
                        {{ job.experience }}
                      </span>
                      <span class="flex items-center gap-1.5 font-semibold text-clay-700">
                        <app-icon name="wallet" [size]="13" />
                        {{ job.salaryRange }}
                      </span>
                    </div>
                  </div>
                  <span
                    class="btn btn-secondary btn-md shrink-0 self-start sm:self-center"
                    aria-hidden="true"
                  >
                    View role
                    <app-icon name="arrow-right" [size]="14" />
                  </span>
                </a>
              </li>
            }
          </ul>
        }

        @if (closed().length) {
          <p class="mt-8 text-caption text-ink-500">
            {{ closed().length }} role(s) recently filled and no longer accepting applications.
          </p>
        }
      </div>
    </section>

    <!-- Applying -->
    <section class="section">
      <div class="container-lux grid gap-10 lg:grid-cols-12">
        <div class="lg:col-span-6">
          <h2 class="text-3xl leading-tight">How to apply</h2>
          <p class="mt-4 leading-relaxed text-ink-600">
            There is no online application system and there is not going to be one. Come to the
            restaurant between three and five in the afternoon, when the kitchen is between
            services, and ask for the manager. Bring whatever paperwork you have.
          </p>
          <ol class="mt-7 space-y-4">
            @for (step of applySteps; track step; let i = $index) {
              <li class="flex gap-3.5">
                <span
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay-50 text-caption font-bold text-clay-700"
                  >{{ i + 1 }}</span
                >
                <span class="text-sm leading-relaxed text-ink-600">{{ step }}</span>
              </li>
            }
          </ol>
        </div>

        <div class="lg:col-span-6">
          <div class="panel p-7">
            <h2 class="font-display text-2xl">Talk to us</h2>
            <p class="mt-2 text-sm leading-relaxed text-ink-600">
              Call and ask for Rashid, the restaurant manager. If he is on the floor, leave your
              number and he will call back.
            </p>
            <div class="mt-6 space-y-2.5">
              <a [href]="'tel:' + brand.phone" class="btn btn-primary btn-lg w-full">
                <app-icon name="phone" [size]="16" />
                {{ brand.phoneDisplay }}
              </a>
              <a routerLink="/contact" class="btn btn-secondary btn-md w-full">
                Send your details in writing
              </a>
            </div>
            <div class="mt-7 rounded-xl border border-clay-600/25 bg-clay-50 p-5">
              <p class="text-sm font-semibold text-clay-800">No experience?</p>
              <p class="mt-1.5 text-sm leading-relaxed text-ink-600">
                The kitchen porter role is a genuine route in. Two of our current chefs started
                there, and we would rather train someone who turns up on time than hire a CV.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class CareersPage {
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;

  protected readonly benefits: { icon: IconName; title: string; body: string }[] = [
    {
      icon: 'utensils',
      title: 'Staff meal every shift',
      body: 'Cooked properly, from the same kitchen, not scraps. Eaten together before service.',
    },
    {
      icon: 'chef',
      title: 'Real progression',
      body: 'Two of our section chefs started as kitchen porters. We promote from the inside first, every time.',
    },
    {
      icon: 'clock',
      title: 'Predictable rota',
      body: 'Published a week ahead. Split shifts are agreed, not imposed at the last minute.',
    },
    {
      icon: 'users',
      title: 'A kitchen worth learning in',
      body: 'Charcoal pits, a live tandoor and deghs at wedding scale. You will learn things a fast-food line cannot teach.',
    },
  ];

  protected readonly applySteps = [
    'Come in between 3pm and 5pm on any day and ask for the manager.',
    'Bring your CNIC, any certificates, and a reference if you have one.',
    'Expect a short conversation and, for kitchen roles, a practical trial shift.',
    'Trial shifts are paid. We will tell you either way within a week.',
  ];

  protected readonly jobs = toSignal(this.content.jobs(), { initialValue: [] as JobOpening[] });
  protected readonly open = computed(() => this.jobs().filter((j) => j.isOpen));
  protected readonly closed = computed(() => this.jobs().filter((j) => !j.isOpen));
  protected readonly openCount = computed(() => this.open().length);

  constructor() {
    this.seo.apply({
      title: 'Careers & Jobs | Salateen Restaurant Swabi',
      description:
        'Jobs at Salateen Restaurant Swabi: grill chef, tandoor baker, floor supervisor, delivery rider and kitchen porter. Staff meals, published rotas and genuine progression.',
      path: 'careers',
      image: 'assets/images/bbq/chef-grilling.webp',
      keywords: ['restaurant jobs Swabi', 'chef jobs Khyber Pakhtunkhwa', 'Salateen careers'],
    });
    this.seo.breadcrumbSchema([{ label: 'Careers', path: 'careers' }]);
  }
}
