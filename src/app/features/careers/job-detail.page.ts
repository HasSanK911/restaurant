import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { BRAND } from '../../core/constants/app.constants';
import { JobOpening } from '../../core/models/content.model';
import { ContentService } from '../../core/services/content.service';
import { SeoService } from '../../core/services/seo.service';
import { HumanisePipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { BadgeComponent, BreadcrumbsComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent, SkeletonComponent } from '../../shared/components/ui/feedback.components';

@Component({
  selector: 'app-job-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    BadgeComponent,
    BreadcrumbsComponent,
    EmptyStateComponent,
    SkeletonComponent,
    HumanisePipe,
  ],
  template: `
    @if (job(); as role) {
      <article class="pt-[calc(var(--header-h)+2.5rem)] pb-24">
        <div class="container-lux max-w-4xl">
          <app-breadcrumbs
            [crumbs]="[{ label: 'Careers', path: '/careers' }, { label: role.title }]"
            class="mb-7"
          />

          <div class="flex flex-wrap items-center gap-2.5">
            <app-badge tone="clay">{{ role.department }}</app-badge>
            <app-badge tone="outline">{{ role.type | humanise }}</app-badge>
            @if (!role.isOpen) {
              <app-badge tone="red">Closed</app-badge>
            }
          </div>

          <h1 class="mt-4 text-4xl leading-tight sm:text-5xl">{{ role.title }}</h1>
          <p class="mt-4 text-lg leading-relaxed text-ink-600">{{ role.description }}</p>

          <!-- Key facts -->
          <dl class="mt-8 grid gap-4 sm:grid-cols-3">
            <div class="card-lux p-5">
              <dt class="flex items-center gap-2 text-caption text-ink-500">
                <app-icon name="wallet" [size]="14" class="text-clay-600" />
                Salary
              </dt>
              <dd class="mt-1.5 text-sm font-semibold text-ink-900">{{ role.salaryRange }}</dd>
            </div>
            <div class="card-lux p-5">
              <dt class="flex items-center gap-2 text-caption text-ink-500">
                <app-icon name="badge" [size]="14" class="text-clay-600" />
                Experience
              </dt>
              <dd class="mt-1.5 text-sm font-semibold text-ink-900">{{ role.experience }}</dd>
            </div>
            <div class="card-lux p-5">
              <dt class="flex items-center gap-2 text-caption text-ink-500">
                <app-icon name="map" [size]="14" class="text-clay-600" />
                Location
              </dt>
              <dd class="mt-1.5 text-sm font-semibold text-ink-900">{{ role.location }}</dd>
            </div>
          </dl>

          <!-- Detail -->
          <div class="mt-12 grid gap-10 lg:grid-cols-2">
            <section>
              <h2 class="font-display text-2xl">What you will do</h2>
              <div class="rule-clay mt-3 w-16"></div>
              <ul class="mt-6 space-y-3">
                @for (item of role.responsibilities; track item) {
                  <li class="flex items-start gap-3 text-sm leading-relaxed text-ink-600">
                    <app-icon
                      name="check"
                      [size]="14"
                      class="mt-1 shrink-0 text-clay-600"
                      [strokeWidth]="2.4"
                    />
                    {{ item }}
                  </li>
                }
              </ul>
            </section>

            <section>
              <h2 class="font-display text-2xl">What we are looking for</h2>
              <div class="rule-clay mt-3 w-16"></div>
              <ul class="mt-6 space-y-3">
                @for (item of role.requirements; track item) {
                  <li class="flex items-start gap-3 text-sm leading-relaxed text-ink-600">
                    <app-icon
                      name="check"
                      [size]="14"
                      class="mt-1 shrink-0 text-clay-600"
                      [strokeWidth]="2.4"
                    />
                    {{ item }}
                  </li>
                }
              </ul>
            </section>
          </div>

          <!-- Apply -->
          <div class="panel mt-12 p-7">
            @if (role.isOpen) {
              <h2 class="font-display text-2xl">Interested?</h2>
              <p class="mt-2 leading-relaxed text-ink-600">
                Come to the restaurant between three and five in the afternoon and ask for the
                manager, or call first. Kitchen roles include a paid trial shift.
              </p>
              <div class="mt-6 flex flex-wrap gap-3">
                <a [href]="'tel:' + brand.phone" class="btn btn-primary btn-lg">
                  <app-icon name="phone" [size]="16" />
                  {{ brand.phoneDisplay }}
                </a>
                <a routerLink="/contact" class="btn btn-secondary btn-lg">Send your details</a>
              </div>
              <p class="mt-4 text-caption text-ink-500">
                {{ brand.street }}, {{ brand.city }}. Open every day, 10am to midnight.
              </p>
            } @else {
              <h2 class="font-display text-2xl">This role has been filled</h2>
              <p class="mt-2 leading-relaxed text-ink-600">
                We are not taking applications for this position at the moment. Have a look at what
                else is open, or leave your details with us anyway.
              </p>
              <a routerLink="/careers" class="btn btn-primary btn-md mt-6">See open roles</a>
            }
          </div>

          <!-- Other roles -->
          @if (others().length) {
            <section class="mt-16 border-t border-ink-200 pt-12">
              <h2 class="font-display text-2xl">Other openings</h2>
              <ul class="mt-8 space-y-3">
                @for (other of others(); track other.id) {
                  <li>
                    <a
                      [routerLink]="['/careers', other.slug]"
                      class="card-lux group flex items-center justify-between gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-clay-500/40"
                    >
                      <span>
                        <span class="block font-display text-lg transition-colors group-hover:text-clay-700">{{
                          other.title
                        }}</span>
                        <span class="mt-0.5 block text-caption text-ink-500"
                          >{{ other.department }} &middot; {{ other.salaryRange }}</span
                        >
                      </span>
                      <app-icon
                        name="arrow-right"
                        [size]="17"
                        class="shrink-0 text-clay-600 transition-transform group-hover:translate-x-1"
                      />
                    </a>
                  </li>
                }
              </ul>
            </section>
          }
        </div>
      </article>
    } @else if (resolved()) {
      <div class="container-lux pt-[calc(var(--header-h)+6rem)] pb-24">
        <app-empty-state
          icon="badge"
          title="That role is no longer listed"
          message="It may have been filled. Have a look at what else is open."
          actionLabel="See open roles"
          (action)="goToCareers()"
        />
      </div>
    } @else {
      <div class="container-lux max-w-4xl space-y-5 pt-[calc(var(--header-h)+4rem)] pb-24">
        <app-skeleton height="1rem" width="30%" />
        <app-skeleton height="3rem" width="60%" />
        <app-skeleton height="1rem" />
        <app-skeleton height="1rem" width="80%" />
        <app-skeleton height="8rem" />
      </div>
    }
  `,
})
export class JobDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);

  protected readonly brand = BRAND;

  /**
   * `undefined` means still loading, `null` means resolved-but-not-found.
   * `toSignal` without `initialValue` gives us exactly that distinction.
   */
  private readonly resolvedJob = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const slug = params.get('slug');
        if (!slug) return of<JobOpening | null>(null);
        return this.content
          .jobBySlug(slug)
          .pipe(map((job) => job ?? null), catchError(() => of<JobOpening | null>(null)));
      }),
    ),
  );

  private readonly all = toSignal(this.content.jobs(), { initialValue: [] as JobOpening[] });

  protected readonly job = computed(() => this.resolvedJob() ?? null);
  protected readonly resolved = computed(() => this.resolvedJob() !== undefined);

  protected readonly others = computed(() => {
    const current = this.job();
    return this.all()
      .filter((j) => j.isOpen && j.id !== current?.id)
      .slice(0, 4);
  });

  constructor() {
    effect(() => {
      const role = this.job();
      if (!role) {
        // Resolved but missing: tell the SSR server to answer a real 404
        // rather than a soft one on a URL that will never have content.
        if (this.resolved()) {
          this.seo.apply({
            title: 'Not Found | Salateen Restaurant Swabi',
            description: 'That page could not be found.',
            path: 'careers',
            noIndex: true,
            statusCode: 404,
          });
        }
        return;
      }
      this.seo.apply({
        title: `${role.title} | Careers at Salateen Restaurant Swabi`,
        description: `${role.description} ${role.salaryRange}. ${role.location}.`,
        path: `careers/${role.slug}`,
        image: 'assets/images/bbq/chef-grilling.webp',
        keywords: [role.title, role.department, 'restaurant jobs Swabi'],
        noIndex: !role.isOpen,
      });
      this.seo.breadcrumbSchema([
        { label: 'Careers', path: 'careers' },
        { label: role.title, path: `careers/${role.slug}` },
      ]);
    });
  }

  protected goToCareers(): void {
    void this.router.navigate(['/careers']);
  }
}
