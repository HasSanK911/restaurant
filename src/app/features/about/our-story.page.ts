import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { PageHeroComponent } from '../../shared/components/ui/page-hero.component';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { ImageComponent } from '../../shared/components/ui/image.component';
import { SectionHeaderComponent } from '../../shared/components/ui/display.components';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { ParallaxDirective } from '../../shared/directives/parallax.directive';

/** The long-form brand narrative: a timeline, the people, and the philosophy. */
@Component({
  selector: 'app-our-story-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeroComponent,
    ImageComponent,
    IconComponent,
    SectionHeaderComponent,
    RevealDirective,
    ParallaxDirective,
  ],
  template: `
    <app-page-hero
      eyebrow="Our story"
      title="From one degh"
      accent=" to three halls"
      description="How a roadside kitchen on Jhangira Road became the table Swabi books for its weddings."
      image="assets/images/exterior/neon-facade"
      imageAlt="The Salateen Restaurant neon sign at night"
      [crumbs]="[{ label: 'Our Story' }]"
      size="lg"
    />

    <!-- Opening -->
    <section class="section">
      <div class="container-lux max-w-3xl">
        <p appReveal class="font-display text-2xl leading-relaxed text-ink-800 sm:text-3xl">
          In 2011 there was one degh, a tandoor, and a stretch of Jhangira Road where the Grand
          Trunk traffic slows enough for a driver to smell charcoal before they see a signboard.
        </p>
        <div appReveal class="mt-8 space-y-5 leading-relaxed text-ink-600 measure">
          <p>
            The plan was not complicated. Cook the food of this region properly, in the quantities
            people here actually eat, and charge what it costs. Mutton karahi finished in copper.
            Seekh kabab turned by hand over open coals. Kabuli Pulao steamed over mutton stock in a
            pot large enough to feed a wedding, because sooner or later it would be asked to.
          </p>
          <p>
            The first family hall went up before the first year was out. In Swabi that is not an
            amenity, it is the difference between a restaurant a family can use and one they cannot.
            Everything since has followed the same logic: build the room the occasion needs.
          </p>
        </div>
      </div>
    </section>

    <!-- Timeline -->
    <section class="section border-y border-ink-200 bg-ink-50">
      <div class="container-lux">
        <app-section-header appReveal eyebrow="Milestones" title="Fifteen years" accent=" on one road" />

        <ol class="relative mx-auto mt-16 max-w-3xl">
          <span
            class="absolute top-2 bottom-2 left-[1.15rem] w-px bg-gradient-to-b from-clay-400 via-ink-300 to-transparent sm:left-1/2"
            aria-hidden="true"
          ></span>

          @for (entry of timeline; track entry.year; let i = $index) {
            <li
              appReveal
              [appRevealDelay]="i * 70"
              class="relative pb-12 pl-14 sm:pl-0"
              [class]="i % 2 === 0 ? 'sm:pr-[calc(50%+2.5rem)]' : 'sm:pl-[calc(50%+2.5rem)]'"
            >
              <span
                class="absolute top-1 left-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-clay-600 bg-white text-caption font-bold text-clay-700 sm:left-1/2 sm:-translate-x-1/2"
                >{{ entry.year.toString().slice(2) }}</span
              >
              <div
                class="card-lux p-5"
                [class]="i % 2 === 0 ? 'sm:text-right' : ''"
              >
                <p class="font-display text-xl">{{ entry.title }}</p>
                <p class="mt-2 text-sm leading-relaxed text-ink-600">{{ entry.body }}</p>
              </div>
            </li>
          }
        </ol>
      </div>
    </section>

    <!-- Philosophy over photo -->
    <section class="grain-overlay relative isolate overflow-hidden py-28">
      <app-image
        src="assets/images/bbq/open-fire-karahi"
        alt="The open karahi over a wood fire at Salateen Restaurant"
        sizes="100vw"
        class="absolute inset-0 h-full w-full"
        [appParallax]="0.09"
      />
      <div class="absolute inset-0 bg-scrim/80" aria-hidden="true"></div>
      <div class="on-photo container-lux relative grid gap-12 lg:grid-cols-12 lg:items-center">
        <div class="lg:col-span-6">
          <p class="eyebrow mb-4">The rule of the house</p>
          <h2 class="text-3xl leading-[1.1] sm:text-4xl lg:text-5xl">
            If it cannot be cooked properly, we would rather say it is finished
          </h2>
        </div>
        <div class="space-y-4 text-white/80 lg:col-span-6">
          <p class="leading-relaxed">
            We buy meat every morning from one butcher in Swabi and use it that day or the next.
            Anything left at the end of a second service goes to staff meal, not to a customer.
          </p>
          <p class="leading-relaxed">
            This is why the mutton dishes occasionally run out late on a Friday, and why we will
            tell you so rather than serve you something that has been sitting. It costs us orders.
            We have decided we can live with that.
          </p>
        </div>
      </div>
    </section>

    <!-- The team -->
    @if (chefs().length) {
      <section class="section">
        <div class="container-lux">
          <app-section-header
            appReveal
            eyebrow="The kitchen"
            title="The people who"
            accent=" actually cook it"
          />
          <ul class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            @for (chef of chefs(); track chef.id; let i = $index) {
              <li appReveal [appRevealDelay]="i * 80">
                <article class="card-lux group h-full overflow-hidden">
                  <div class="aspect-[4/5] overflow-hidden">
                    <app-image
                      [src]="chef.photo"
                      [alt]="chef.name + ', ' + chef.title"
                      sizes="(max-width: 640px) 92vw, 18rem"
                      class="h-full w-full transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div class="p-5">
                    <p class="eyebrow">{{ chef.title }}</p>
                    <h3 class="mt-1.5 font-display text-xl">{{ chef.name }}</h3>
                    <p class="mt-1 text-xs text-ink-500">{{ chef.yearsExperience }} years</p>
                    <p class="mt-3 line-clamp-4 text-sm leading-relaxed text-ink-600">{{ chef.bio }}</p>
                    <p
                      class="mt-4 border-l-2 border-clay-500/50 pl-3 font-display text-sm leading-snug text-ink-700 italic"
                    >
                      {{ chef.quote }}
                    </p>
                  </div>
                </article>
              </li>
            }
          </ul>
        </div>
      </section>
    }

    <!-- Close -->
    <section class="section border-t border-ink-200 bg-ink-50">
      <div class="container-lux max-w-2xl text-center">
        <app-icon name="quote" [size]="28" class="mx-auto text-clay-500" />
        <p class="mt-6 font-display text-2xl leading-relaxed text-ink-800 sm:text-3xl">
          Rice does not forgive a weak stock. Everything else you can fix.
        </p>
        <p class="mt-4 text-sm font-semibold text-clay-700">Gulzar Ahmad, Head Chef</p>
        <div class="mt-10 flex flex-wrap justify-center gap-3">
          <a routerLink="/menu" class="btn btn-primary btn-lg">Read the menu</a>
          <a routerLink="/reservation" class="btn btn-secondary btn-lg">Book a table</a>
        </div>
      </div>
    </section>
  `,
})
export class OurStoryPage {
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);

  protected readonly chefs = computed(() => this.content.chefs());

  protected readonly timeline = [
    {
      year: 2011,
      title: 'The doors open',
      body: 'One degh, one tandoor and eight tables on Jhangira Road. The first menu ran to fourteen items.',
    },
    {
      year: 2013,
      title: 'The family hall',
      body: 'Partitioned seating with full purdah goes in, along with a dedicated attendant. It fills from the first week.',
    },
    {
      year: 2015,
      title: 'The charcoal pits',
      body: 'The BBQ section moves outside onto proper hardwood pits, lit daily at four. Fazal Rabi joins to run them.',
    },
    {
      year: 2017,
      title: 'Catering begins',
      body: 'The first walima order, 180 guests in Swabi city. Deghs, chafing dishes and an on-site tandoor.',
    },
    {
      year: 2019,
      title: 'The lawn',
      body: 'Outdoor tables open beside the pits, with winter marquees. The Grand Platter becomes the signature order.',
    },
    {
      year: 2022,
      title: 'Home delivery',
      body: 'Free delivery inside Swabi city above Rs 2,500. Two riders, growing to cover Topi, Kalu Khan and Yar Hussain.',
    },
    {
      year: 2026,
      title: 'Online ordering',
      body: 'The full menu, table booking and order tracking come online. Still cash only, still cooked to order.',
    },
  ];

  constructor() {
    this.seo.apply({
      title: 'Our Story | Salateen Restaurant Swabi',
      description:
        'From one degh on Jhangira Road in 2011 to three halls, a family wing and a lawn beside the charcoal pits. The story of Salateen Restaurant Swabi and the people who cook there.',
      path: 'our-story',
      image: 'assets/images/exterior/neon-facade.webp',
      keywords: ['Salateen Restaurant story', 'Swabi restaurant history', 'Pakhtun kitchen'],
    });
    this.seo.breadcrumbSchema([{ label: 'Our Story', path: 'our-story' }]);
  }
}
