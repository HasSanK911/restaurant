import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent, IconName } from '../../../shared/components/ui/icon.component';

/**
 * Shared admin chrome.
 *
 * Twenty-odd back-office screens share the same three shapes: a page header, a
 * toolbar with search and filters, and a table shell. Keeping them here means
 * one change restyles the whole panel, and each module page stays about its own
 * data rather than its layout.
 */

@Component({
  selector: 'app-admin-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'block' },
  template: `
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        @if (eyebrow()) {
          <p class="eyebrow">{{ eyebrow() }}</p>
        }
        <h1 class="mt-1.5 font-display text-3xl">{{ title() }}</h1>
        @if (description()) {
          <p class="mt-1.5 max-w-2xl text-sm text-ink-600">{{ description() }}</p>
        }
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2.5">
        <ng-content />
        @if (actionLabel()) {
          <button type="button" class="btn btn-primary btn-md" (click)="action.emit()">
            <app-icon [name]="actionIcon()" [size]="15" [strokeWidth]="2.2" />
            {{ actionLabel() }}
          </button>
        }
      </div>
    </div>
  `,
})
export class AdminHeaderComponent {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly description = input('');
  readonly actionLabel = input('');
  readonly actionIcon = input<IconName>('plus');
  readonly action = output<void>();
}

/** Search box plus an optional select filter row. */
@Component({
  selector: 'app-admin-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <app-icon
          name="search"
          [size]="16"
          class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-400"
        />
        <input
          type="search"
          class="field pl-11"
          [placeholder]="placeholder()"
          [attr.aria-label]="placeholder()"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
        />
      </div>
      <ng-content />
      @if (count() !== null) {
        <span class="shrink-0 text-caption text-ink-500">{{ count() }} result(s)</span>
      }
    </div>
  `,
})
export class AdminToolbarComponent {
  readonly search = model('');
  readonly placeholder = input('Search');
  readonly count = input<number | null>(null);
}

/** Table shell: a bordered panel with an overflow-x scroller. */
@Component({
  selector: 'app-admin-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="panel overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table-lux">
          <ng-content />
        </table>
      </div>
    </div>
  `,
})
export class AdminTableComponent {}

/** Row-level icon action, used across every list. */
@Component({
  selector: 'app-row-action',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'inline-flex' },
  template: `
    <button
      type="button"
      class="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition-colors"
      [class]="
        danger()
          ? 'hover:border-red-500/40 hover:bg-red-50 hover:text-red-600'
          : 'hover:border-clay-500/40 hover:bg-clay-50 hover:text-clay-700'
      "
      [attr.aria-label]="label()"
      [attr.title]="label()"
      [disabled]="disabled()"
      (click)="pressed.emit()"
    >
      <app-icon [name]="icon()" [size]="14" />
    </button>
  `,
})
export class RowActionComponent {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly danger = input(false);
  readonly disabled = input(false);
  readonly pressed = output<void>();
}

/** Compact status pill for admin tables. */
@Component({
  selector: 'app-status-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-micro font-bold whitespace-nowrap uppercase"
      [class]="toneClass()"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>
      <ng-content />
    </span>
  `,
})
export class StatusPillComponent {
  readonly tone = input<string>('ink');
  protected readonly toneClass = computed(
    () =>
      ({
        clay: 'border-clay-600/30 bg-clay-50 text-clay-700',
        basil: 'border-basil-600/25 bg-basil-50 text-basil-700',
        turmeric: 'border-turmeric-500/35 bg-turmeric-300/20 text-turmeric-600',
        emerald: 'border-emerald-600/25 bg-emerald-50 text-emerald-700',
        amber: 'border-amber-500/35 bg-amber-50 text-amber-700',
        red: 'border-red-500/25 bg-red-50 text-red-700',
        ink: 'border-ink-300 bg-ink-100 text-ink-600',
      })[this.tone()] ?? 'border-ink-300 bg-ink-100 text-ink-600',
  );
}
