import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from './icon.component';
import { Toast, ToastService, ToastTone } from '../../../core/services/toast.service';

/**
 * Modal built on the native `<dialog>` element, which gives us the top layer,
 * focus trapping and Escape handling for free rather than reimplementing them.
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <dialog
      #dialog
      class="m-auto w-[min(94vw,var(--modal-w))] rounded-2xl border border-clay-500/15 bg-ink-50 p-0 text-ink-900 shadow-lux backdrop:bg-black/70"
      [style.--modal-w]="widthPx()"
      (close)="open.set(false)"
      (click)="onBackdropClick($event)"
    >
      <div class="flex max-h-[86vh] flex-col" (click)="$event.stopPropagation()">
        <header class="flex items-start justify-between gap-4 border-b border-ink-200 px-6 py-5">
          <div class="min-w-0">
            <h2 class="font-display text-2xl leading-tight text-ink-900">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="mt-1 text-sm text-ink-500">{{ subtitle() }}</p>
            }
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-icon -mt-1 -mr-2 shrink-0"
            aria-label="Close dialog"
            (click)="close()"
          >
            <app-icon name="close" [size]="18" />
          </button>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <ng-content />
        </div>
        <footer class="border-t border-ink-200 px-6 py-4">
          <ng-content select="[modalFooter]" />
        </footer>
      </div>
    </dialog>
  `,
})
export class ModalComponent {
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly width = input(560);
  readonly closeOnBackdrop = input(true);
  readonly dismissed = output<void>();

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly widthPx = () => `${this.width()}px`;

  constructor() {
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) return;
      if (this.open() && !dialog.open) dialog.showModal();
      else if (!this.open() && dialog.open) dialog.close();
    });
  }

  close(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    // Clicks that land on the dialog element itself came from the backdrop,
    // because the inner wrapper stops propagation.
    if (this.closeOnBackdrop() && event.target === this.dialogRef()?.nativeElement) this.close();
  }
}

/** Yes/no dialog. Bind `open` and listen for `confirmed`. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, IconComponent],
  template: `
    <app-modal [open]="open()" (openChange)="open.set($event)" [title]="title()" [width]="440">
      <div class="flex gap-4">
        <span
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          [class]="
            danger()
              ? 'border border-red-500/30 bg-red-500/10 text-red-600'
              : 'border border-clay-500/25 bg-clay-500/8 text-clay-600'
          "
        >
          <app-icon [name]="danger() ? 'alert' : 'help'" [size]="20" />
        </span>
        <p class="pt-1.5 text-sm leading-relaxed text-ink-700">{{ message() }}</p>
      </div>
      <div modalFooter class="flex justify-end gap-3">
        <button type="button" class="btn btn-ghost btn-md" (click)="open.set(false)">
          {{ cancelLabel() }}
        </button>
        <button
          type="button"
          class="btn btn-md"
          [class]="danger() ? 'btn-danger' : 'btn-primary'"
          (click)="confirm()"
        >
          {{ confirmLabel() }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ConfirmDialogComponent {
  readonly open = model(false);
  readonly title = input('Are you sure?');
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly danger = input(false);
  readonly confirmed = output<void>();

  protected confirm(): void {
    this.open.set(false);
    this.confirmed.emit();
  }
}

const TOAST_STYLE: Record<ToastTone, { ring: string; icon: 'check-circle' | 'x-circle' | 'info' | 'alert'; tint: string }> = {
  success: { ring: 'border-emerald-500/35', icon: 'check-circle', tint: 'text-emerald-700' },
  error: { ring: 'border-red-500/35', icon: 'x-circle', tint: 'text-red-600' },
  info: { ring: 'border-basil-400/35', icon: 'info', tint: 'text-basil-700' },
  warning: { ring: 'border-amber-500/35', icon: 'alert', tint: 'text-amber-700' },
};

/** Global toast stack. Mounted once by the app shell. */
@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-toast)] flex flex-col items-center gap-2.5 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end sm:pb-0"
      role="region"
      aria-label="Notifications"
    >
      @for (toast of toasts(); track toast.id) {
        <div
          class="glass-strong pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3.5 shadow-lux"
          [class]="style(toast.tone).ring"
          role="status"
          aria-live="polite"
          style="animation: fade-up 0.35s cubic-bezier(0.22,1,0.36,1) both"
        >
          <app-icon
            [name]="style(toast.tone).icon"
            [size]="18"
            [class]="style(toast.tone).tint + ' mt-0.5'"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-ink-900">{{ toast.title }}</p>
            @if (toast.message) {
              <p class="mt-0.5 text-xs leading-relaxed text-ink-600">{{ toast.message }}</p>
            }
            @if (toast.action) {
              <button
                type="button"
                class="mt-2 text-xs font-bold tracking-wide text-clay-700 uppercase hover:text-clay-700"
                (click)="runAction(toast)"
              >
                {{ toast.action.label }}
              </button>
            }
          </div>
          <button
            type="button"
            class="-mt-1 -mr-1 rounded-lg p-1.5 text-ink-500 transition-colors hover:text-ink-900"
            aria-label="Dismiss notification"
            (click)="toastService.dismiss(toast.id)"
          >
            <app-icon name="close" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);
  protected readonly toasts = this.toastService.toasts;
  protected style(tone: ToastTone) {
    return TOAST_STYLE[tone];
  }
  protected runAction(toast: Toast): void {
    toast.action?.run();
    this.toastService.dismiss(toast.id);
  }
}

/**
 * Right-hand slide-over panel. Used for the cart and admin filter panels.
 * `<dialog>` is not used here because the drawer animates from the edge and
 * needs a transitioning backdrop.
 */
@Component({
  selector: 'app-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="fixed inset-0 z-[var(--z-modal)] transition-opacity duration-300"
      [class]="open() ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'"
      [attr.aria-hidden]="!open()"
    >
      <div class="absolute inset-0 bg-black/65 backdrop-blur-sm" (click)="close()"></div>
      <aside
        class="absolute inset-y-0 right-0 flex w-[min(94vw,26rem)] flex-col border-l border-clay-500/12 bg-ink-50 shadow-lux transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
        [class]="open() ? 'translate-x-0' : 'translate-x-full'"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
      >
        <header class="flex items-center justify-between gap-4 border-b border-ink-200 px-5 py-4">
          <h2 class="font-display text-xl text-ink-900">{{ title() }}</h2>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            aria-label="Close panel"
            (click)="close()"
          >
            <app-icon name="close" [size]="18" />
          </button>
        </header>
        <ng-content />
      </aside>
    </div>
  `,
})
export class DrawerComponent {
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly dismissed = output<void>();

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.close();
  }

  close(): void {
    this.open.set(false);
    this.dismissed.emit();
  }
}
