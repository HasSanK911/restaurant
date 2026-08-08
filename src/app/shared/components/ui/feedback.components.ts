import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

/** Shimmering placeholder block. Compose several to mirror the real layout. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `<div class="skeleton" [style.height]="height()" [style.width]="width()" [class]="rounded()"></div>`,
})
export class SkeletonComponent {
  readonly height = input('1rem');
  readonly width = input('100%');
  readonly rounded = input('rounded-lg');
}

/** Card-shaped skeleton used by menu, blog and gallery grids. */
@Component({
  selector: 'app-skeleton-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent],
  host: { class: 'block' },
  template: `
    <div class="card-lux overflow-hidden p-0">
      <app-skeleton height="13rem" rounded="rounded-none" />
      <div class="space-y-3 p-5">
        <app-skeleton height="0.7rem" width="35%" />
        <app-skeleton height="1.15rem" width="75%" />
        <app-skeleton height="0.8rem" />
        <app-skeleton height="0.8rem" width="60%" />
        <div class="flex items-center justify-between pt-2">
          <app-skeleton height="1.4rem" width="28%" />
          <app-skeleton height="2.2rem" width="30%" rounded="rounded-full" />
        </div>
      </div>
    </div>
  `,
})
export class SkeletonCardComponent {}

@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <span
      class="animate-spin rounded-full border-2 border-current border-t-transparent"
      [style.width.px]="size()"
      [style.height.px]="size()"
      role="status"
      [attr.aria-label]="label()"
    ></span>
  `,
})
export class SpinnerComponent {
  readonly size = input(18);
  readonly label = input('Loading');
}

/**
 * Empty state. Every list in the app renders one of these instead of nothing,
 * so a filtered-to-zero menu still explains itself and offers a way out.
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        class="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-clay-500/25 bg-clay-500/5 text-clay-600"
      >
        <app-icon [name]="icon()" [size]="26" />
      </div>
      <h3 class="font-display text-2xl text-ink-900">{{ title() }}</h3>
      @if (message()) {
        <p class="mt-2 max-w-sm text-sm leading-relaxed text-ink-600">{{ message() }}</p>
      }
      @if (actionLabel()) {
        <button type="button" class="btn btn-secondary btn-md mt-6" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input<IconName>('search');
  readonly title = input.required<string>();
  readonly message = input('');
  readonly actionLabel = input('');
  readonly action = output<void>();
}

/** Failure state with a retry affordance. */
@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        class="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-red-600"
      >
        <app-icon name="alert" [size]="26" />
      </div>
      <h3 class="font-display text-2xl text-ink-900">{{ title() }}</h3>
      <p class="mt-2 max-w-md text-sm leading-relaxed text-ink-600">{{ message() }}</p>
      <button type="button" class="btn btn-secondary btn-md mt-6" (click)="retry.emit()">
        <app-icon name="refresh" [size]="16" />
        Try again
      </button>
    </div>
  `,
})
export class ErrorStateComponent {
  readonly title = input('That did not load');
  readonly message = input(
    'We could not reach the kitchen just now. Check that the demo API is running and try again.',
  );
  readonly retry = output<void>();
}
