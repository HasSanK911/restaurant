import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { IconComponent } from './icon.component';

/** Accessible +/- stepper used in the cart, the item detail page and admin. */
@Component({
  selector: 'app-quantity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'inline-flex' },
  template: `
    <div
      class="inline-flex items-center rounded-full border border-ink-200 bg-ink-50/70"
      [class]="size() === 'sm' ? 'h-9' : 'h-11'"
    >
      <button
        type="button"
        class="flex h-full items-center justify-center rounded-l-full px-3 text-ink-600 transition-colors hover:text-clay-700 disabled:opacity-35 disabled:hover:text-ink-600"
        [disabled]="value() <= min()"
        [attr.aria-label]="'Decrease ' + itemLabel()"
        (click)="step(-1)"
      >
        <app-icon name="minus" [size]="15" [strokeWidth]="2.2" />
      </button>
      <span
        class="min-w-9 text-center text-sm font-bold tabular-nums text-ink-900"
        aria-live="polite"
        [attr.aria-label]="itemLabel() + ' quantity'"
        >{{ value() }}</span
      >
      <button
        type="button"
        class="flex h-full items-center justify-center rounded-r-full px-3 text-ink-600 transition-colors hover:text-clay-700 disabled:opacity-35 disabled:hover:text-ink-600"
        [disabled]="value() >= max()"
        [attr.aria-label]="'Increase ' + itemLabel()"
        (click)="step(1)"
      >
        <app-icon name="plus" [size]="15" [strokeWidth]="2.2" />
      </button>
    </div>
  `,
})
export class QuantityComponent {
  readonly value = model.required<number>();
  readonly min = input(1);
  readonly max = input(50);
  readonly size = input<'sm' | 'md'>('md');
  readonly itemLabel = input('quantity');
  readonly changed = output<number>();

  protected step(delta: number): void {
    const next = Math.min(this.max(), Math.max(this.min(), this.value() + delta));
    if (next === this.value()) return;
    this.value.set(next);
    this.changed.emit(next);
  }
}

/**
 * Label + control + error wrapper.
 *
 * Takes the `AbstractControl` so it can decide when to show errors (touched or
 * dirty only) and render the right message, which keeps that logic out of every
 * form template in the app.
 */
@Component({
  selector: 'app-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'block' },
  template: `
    <div>
      @if (label()) {
        <label class="field-label" [attr.for]="fieldId()">
          {{ label() }}
          @if (required()) {
            <span class="text-clay-600" aria-hidden="true">*</span>
            <span class="sr-only">(required)</span>
          }
        </label>
      }
      <ng-content />
      @if (hint() && !showError()) {
        <p class="mt-1.5 text-xs text-ink-500">{{ hint() }}</p>
      }
      @if (showError()) {
        <p class="field-error" role="alert">
          <app-icon name="alert" [size]="13" [strokeWidth]="2" />
          {{ errorMessage() }}
        </p>
      }
    </div>
  `,
})
export class FieldComponent {
  readonly label = input('');
  readonly fieldId = input('');
  readonly hint = input('');
  readonly required = input(false);
  readonly control = input<AbstractControl | null>(null);
  /** Overrides the derived message when a form needs bespoke wording. */
  readonly error = input('');

  protected readonly showError = computed(() => {
    if (this.error()) return true;
    const control = this.control();
    return !!control && control.invalid && (control.touched || control.dirty);
  });

  protected readonly errorMessage = computed(() => {
    if (this.error()) return this.error();
    const errors = this.control()?.errors;
    if (!errors) return '';
    const name = this.label() || 'This field';
    if (errors['required']) return `${name} is required.`;
    if (errors['email']) return 'Enter a valid email address.';
    if (errors['minlength'])
      return `${name} must be at least ${errors['minlength'].requiredLength} characters.`;
    if (errors['maxlength'])
      return `${name} must be ${errors['maxlength'].requiredLength} characters or fewer.`;
    if (errors['min']) return `${name} must be at least ${errors['min'].min}.`;
    if (errors['max']) return `${name} must be ${errors['max'].max} or less.`;
    if (errors['pattern']) return `${name} is not in the expected format.`;
    if (errors['pakPhone']) return 'Enter a Pakistani mobile number, e.g. 0312-0991116.';
    if (errors['passwordMismatch']) return 'The two passwords do not match.';
    if (errors['pastDate']) return 'Pick a date from today onwards.';
    return 'Please check this field.';
  });
}

export interface SegmentOption<T = string> {
  value: T;
  label: string;
  icon?: string;
}

/** Segmented control. Used for delivery vs dine-in and admin status filters. */
@Component({
  selector: 'app-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      class="inline-flex w-full rounded-full border border-ink-200 bg-ink-50/70 p-1"
      role="radiogroup"
      [attr.aria-label]="ariaLabel()"
    >
      @for (option of options(); track option.value) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="option.value === value()"
          class="flex-1 rounded-full px-4 py-2 text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-300"
          [class]="
            option.value === value()
              ? 'bg-gradient-to-r from-clay-400 to-clay-600 text-white shadow-clay'
              : 'text-ink-600 hover:text-ink-900'
          "
          (click)="select(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class SegmentedComponent<T extends string = string> {
  readonly options = input.required<SegmentOption<T>[]>();
  readonly value = model.required<T>();
  readonly ariaLabel = input('Options');
  readonly changed = output<T>();

  protected select(value: T): void {
    if (value === this.value()) return;
    this.value.set(value);
    this.changed.emit(value);
  }
}
