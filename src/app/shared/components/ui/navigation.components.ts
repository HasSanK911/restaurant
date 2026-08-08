import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { IconComponent } from './icon.component';

/** Numbered pagination with ellipsis collapsing for long ranges. */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'block' },
  template: `
    @if (totalPages() > 1) {
      <nav class="flex items-center justify-center gap-1.5" aria-label="Pagination">
        <button
          type="button"
          class="btn btn-ghost btn-icon border border-ink-200"
          [disabled]="page() === 1"
          aria-label="Previous page"
          (click)="go(page() - 1)"
        >
          <app-icon name="chevron-left" [size]="16" />
        </button>

        @for (entry of pages(); track $index) {
          @if (entry === null) {
            <span class="px-1.5 text-ink-400" aria-hidden="true">&hellip;</span>
          } @else {
            <button
              type="button"
              class="h-10 min-w-10 rounded-full px-3 text-sm font-semibold transition-all duration-300"
              [class]="
                entry === page()
                  ? 'bg-gradient-to-r from-clay-400 to-clay-600 text-white shadow-clay'
                  : 'border border-ink-200 text-ink-600 hover:border-clay-500/40 hover:text-clay-700'
              "
              [attr.aria-current]="entry === page() ? 'page' : null"
              [attr.aria-label]="'Page ' + entry"
              (click)="go(entry)"
            >
              {{ entry }}
            </button>
          }
        }

        <button
          type="button"
          class="btn btn-ghost btn-icon border border-ink-200"
          [disabled]="page() === totalPages()"
          aria-label="Next page"
          (click)="go(page() + 1)"
        >
          <app-icon name="chevron-right" [size]="16" />
        </button>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();

  /** `null` entries render as an ellipsis. */
  protected readonly pages = computed<(number | null)[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const out: (number | null)[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) out.push(null);
    for (let i = start; i <= end; i++) out.push(i);
    if (end < total - 1) out.push(null);
    out.push(total);
    return out;
  });

  protected go(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.pageChange.emit(page);
  }
}

export interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

/** FAQ-style accordion. Single-open by default, keyboard accessible. */
@Component({
  selector: 'app-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'block' },
  template: `
    <div class="divide-y divide-ink-200">
      @for (item of items(); track item.id) {
        <div>
          <h3>
            <button
              type="button"
              class="group flex w-full items-start justify-between gap-4 py-5 text-left transition-colors"
              [attr.aria-expanded]="isOpen(item.id)"
              [attr.aria-controls]="'panel-' + item.id"
              [id]="'trigger-' + item.id"
              (click)="toggle(item.id)"
            >
              <span
                class="text-body-lg font-semibold transition-colors"
                [class]="isOpen(item.id) ? 'text-clay-700' : 'text-ink-900 group-hover:text-clay-700'"
                >{{ item.question }}</span
              >
              <span
                class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-400"
                [class]="
                  isOpen(item.id)
                    ? 'rotate-180 border-clay-500/45 bg-clay-500/10 text-clay-700'
                    : 'border-ink-200 text-ink-500 group-hover:border-clay-500/30 group-hover:text-clay-700'
                "
              >
                <app-icon name="chevron-down" [size]="14" [strokeWidth]="2" />
              </span>
            </button>
          </h3>
          <div
            [id]="'panel-' + item.id"
            role="region"
            [attr.aria-labelledby]="'trigger-' + item.id"
            class="grid transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
            [class]="isOpen(item.id) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
          >
            <div class="overflow-hidden">
              <p class="pr-11 pb-6 text-base leading-relaxed text-ink-600">{{ item.answer }}</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AccordionComponent {
  readonly items = input.required<AccordionItem[]>();
  readonly multiple = input(false);
  readonly initialOpen = input<string | null>(null);

  private readonly openIds = signal<Set<string>>(new Set());
  private touched = false;

  protected isOpen(id: string): boolean {
    if (!this.touched && this.initialOpen() === id) return true;
    return this.openIds().has(id);
  }

  protected toggle(id: string): void {
    this.touched = true;
    this.openIds.update((current) => {
      const next = this.multiple() ? new Set(current) : new Set<string>();
      if (current.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
}

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

/** Underlined tab bar with an animated indicator. */
@Component({
  selector: 'app-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="no-scrollbar overflow-x-auto border-b border-ink-200">
      <div class="flex min-w-max gap-1" role="tablist" [attr.aria-label]="ariaLabel()">
        @for (tab of tabs(); track tab.id) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab.id === active()"
            [attr.id]="'tab-' + tab.id"
            class="relative px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors"
            [class]="tab.id === active() ? 'text-clay-700' : 'text-ink-500 hover:text-ink-900'"
            (click)="select(tab.id)"
          >
            {{ tab.label }}
            @if (tab.count !== undefined) {
              <span
                class="ml-2 rounded-full px-2 py-0.5 text-caption font-bold"
                [class]="tab.id === active() ? 'bg-clay-500/15 text-clay-700' : 'bg-ink-100 text-ink-500'"
                >{{ tab.count }}</span
              >
            }
            @if (tab.id === active()) {
              <span
                class="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-clay-400 to-clay-600"
                aria-hidden="true"
              ></span>
            }
          </button>
        }
      </div>
    </div>
  `,
})
export class TabsComponent {
  readonly tabs = input.required<TabItem[]>();
  readonly active = model.required<string>();
  readonly ariaLabel = input('Sections');
  readonly changed = output<string>();

  protected select(id: string): void {
    if (id === this.active()) return;
    this.active.set(id);
    this.changed.emit(id);
  }
}
