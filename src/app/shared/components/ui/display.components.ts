import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from './icon.component';

/** Star rating. Renders half stars via a clipped overlay. */
@Component({
  selector: 'app-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-1.5' },
  template: `
    <span class="relative inline-block leading-none" [attr.aria-label]="ariaLabel()" role="img">
      <span class="flex text-ink-400" aria-hidden="true">
        @for (s of stars; track $index) {
          <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="m12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8L12 3.5Z"
            />
          </svg>
        }
      </span>
      <span
        class="absolute inset-0 flex overflow-hidden text-clay-600"
        [style.width.%]="fillPercent()"
        aria-hidden="true"
      >
        @for (s of stars; track $index) {
          <svg
            [attr.width]="size()"
            [attr.height]="size()"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="shrink-0"
          >
            <path
              d="m12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8L12 3.5Z"
            />
          </svg>
        }
      </span>
    </span>
    @if (showValue()) {
      <span class="text-sm font-semibold text-ink-900">{{ value().toFixed(1) }}</span>
    }
    @if (count() !== null) {
      <span class="text-xs text-ink-500">({{ count() }})</span>
    }
  `,
})
export class RatingComponent {
  readonly value = input.required<number>();
  readonly count = input<number | null>(null);
  readonly size = input(15);
  readonly showValue = input(false);

  protected readonly stars = [0, 1, 2, 3, 4];
  protected readonly fillPercent = computed(() =>
    Math.max(0, Math.min(100, (this.value() / 5) * 100)),
  );
  protected readonly ariaLabel = computed(() => `Rated ${this.value().toFixed(1)} out of 5`);
}

/** Chilli meter, 0 to 3, matching `SpiceLevel`. */
@Component({
  selector: 'app-spice-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-1' },
  template: `
    <span class="sr-only">Spice level: {{ label() }}</span>
    @for (i of levels; track i) {
      <span
        class="h-1.5 w-4 rounded-full transition-colors"
        [class]="i < level() ? toneClass() : 'bg-ink-200'"
        aria-hidden="true"
      ></span>
    }
    @if (showLabel()) {
      <span class="ml-1.5 text-micro font-semibold tracking-wide text-ink-600 uppercase">{{
        label()
      }}</span>
    }
  `,
})
export class SpiceMeterComponent {
  readonly level = input.required<number>();
  readonly showLabel = input(true);

  protected readonly levels = [0, 1, 2];
  protected readonly label = computed(
    () => ['Mild', 'Medium', 'Hot', 'Fiery'][Math.min(3, Math.max(0, this.level()))],
  );
  protected readonly toneClass = computed(() =>
    this.level() >= 3 ? 'bg-red-500' : this.level() === 2 ? 'bg-turmeric-500' : 'bg-clay-500',
  );
}

export type BadgeTone =
  | 'clay'
  | 'basil'
  | 'turmeric'
  | 'emerald'
  | 'amber'
  | 'red'
  | 'ink'
  | 'outline';

const TONE_CLASSES: Record<BadgeTone, string> = {
  clay: 'border-clay-600/35 bg-clay-50 text-clay-700',
  basil: 'border-basil-600/30 bg-basil-50 text-basil-700',
  turmeric: 'border-turmeric-500/40 bg-turmeric-300/25 text-turmeric-600',
  emerald: 'border-emerald-600/30 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-500/40 bg-amber-50 text-amber-700',
  red: 'border-red-500/30 bg-red-50 text-red-700',
  ink: 'border-ink-300 bg-ink-100 text-ink-700',
  outline: 'border-ink-300 bg-transparent text-ink-600',
};

@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'inline-flex' },
  template: `
    <span class="chip" [class]="toneClass()">
      @if (icon()) {
        <app-icon [name]="icon()!" [size]="12" [strokeWidth]="2" />
      }
      @if (dot()) {
        <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>
      }
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('clay');
  readonly icon = input<IconName | null>(null);
  readonly dot = input(false);
  protected readonly toneClass = computed(() => TONE_CLASSES[this.tone()]);
}

/** Centred or left-aligned section heading with the gold eyebrow and rule. */
@Component({
  selector: 'app-section-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div [class]="align() === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'">
      @if (eyebrow()) {
        <p class="eyebrow mb-3">{{ eyebrow() }}</p>
      }
      <h2 [class]="titleClass()">
        {{ title() }}
        @if (accent()) {
          <span class="text-gradient-clay italic">{{ accent() }}</span>
        }
      </h2>
      @if (align() === 'center') {
        <div class="rule-clay mx-auto mt-5 w-28"></div>
      }
      @if (description()) {
        <p class="mt-5 text-base leading-relaxed text-ink-600">{{ description() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class SectionHeaderComponent {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  /** Rendered in italic gold after the title. */
  readonly accent = input('');
  readonly description = input('');
  readonly align = input<'left' | 'center'>('center');
  readonly level = input<'h1' | 'h2'>('h2');

  protected readonly titleClass = computed(() =>
    this.level() === 'h1'
      ? 'text-4xl leading-[1.05] text-ink-900 sm:text-5xl lg:text-6xl'
      : 'text-display text-ink-900',
  );
}

export interface Crumb {
  label: string;
  path?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  host: { class: 'block' },
  template: `
    <nav aria-label="Breadcrumb">
      <ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <li class="flex items-center gap-2">
          <a routerLink="/" class="text-ink-500 transition-colors hover:text-clay-700">Home</a>
        </li>
        @for (crumb of crumbs(); track crumb.label) {
          <li class="flex items-center gap-2">
            <app-icon name="chevron-right" [size]="12" class="text-ink-500" />
            @if (crumb.path && !$last) {
              <a [routerLink]="crumb.path" class="text-ink-500 transition-colors hover:text-clay-700">{{
                crumb.label
              }}</a>
            } @else {
              <span class="font-medium text-clay-700" aria-current="page">{{ crumb.label }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class BreadcrumbsComponent {
  readonly crumbs = input.required<Crumb[]>();
}

/** KPI tile used across the admin dashboard. */
@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'block' },
  template: `
    <div class="panel group relative overflow-hidden p-5 transition-colors hover:border-clay-500/30">
      <div
        class="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-clay-500/5 blur-2xl transition-opacity group-hover:opacity-100 md:opacity-0"
        aria-hidden="true"
      ></div>
      <div class="relative flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="truncate text-micro font-semibold tracking-[0.16em] text-ink-500 uppercase">
            {{ label() }}
          </p>
          <p class="mt-2 font-display text-3xl leading-none text-ink-900">{{ value() }}</p>
          @if (delta() !== null) {
            <p class="mt-2.5 flex items-center gap-1.5 text-xs font-semibold" [class]="deltaClass()">
              <app-icon [name]="delta()! >= 0 ? 'trending-up' : 'trending-down'" [size]="14" />
              {{ delta()! >= 0 ? '+' : '' }}{{ delta() }}%
              <span class="font-normal text-ink-500">{{ deltaLabel() }}</span>
            </p>
          } @else if (hint()) {
            <p class="mt-2.5 text-xs text-ink-500">{{ hint() }}</p>
          }
        </div>
        <span
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-clay-500/20 bg-clay-500/8 text-clay-600"
        >
          <app-icon [name]="icon()" [size]="20" />
        </span>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<IconName>('chart');
  readonly delta = input<number | null>(null);
  readonly deltaLabel = input('vs yesterday');
  readonly hint = input('');

  protected readonly deltaClass = computed(() =>
    (this.delta() ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600',
  );
}
