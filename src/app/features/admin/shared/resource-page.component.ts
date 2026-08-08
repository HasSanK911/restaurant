import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ID } from '../../../core/models/common.model';
import { ToastService } from '../../../core/services/toast.service';
import { IconName } from '../../../shared/components/ui/icon.component';
import { ImageComponent } from '../../../shared/components/ui/image.component';
import {
  EmptyStateComponent,
  SkeletonComponent,
} from '../../../shared/components/ui/feedback.components';
import { PaginationComponent } from '../../../shared/components/ui/navigation.components';
import {
  ConfirmDialogComponent,
  ModalComponent,
} from '../../../shared/components/ui/overlay.components';
import {
  AdminHeaderComponent,
  AdminTableComponent,
  AdminToolbarComponent,
  RowActionComponent,
  StatusPillComponent,
} from './admin-ui.components';

/** How a cell renders. `text` is the default. */
export type CellKind = 'text' | 'strong' | 'muted' | 'money' | 'date' | 'image' | 'status' | 'toggle' | 'chips';

export interface ResourceColumn<T> {
  header: string;
  kind?: CellKind;
  /** Primary value. */
  value: (row: T) => string | number | null | undefined;
  /** Second line under the primary value. */
  sub?: (row: T) => string | null | undefined;
  /** Status pill tone, when `kind` is `status`. */
  tone?: (row: T) => string;
  /** Chip list, when `kind` is `chips`. */
  chips?: (row: T) => string[];
  /** Current state, when `kind` is `toggle`. */
  checked?: (row: T) => boolean;
  /** Called when a toggle changes. */
  onToggle?: (row: T, value: boolean) => void;
  align?: 'left' | 'right';
  hideBelow?: 'sm' | 'md' | 'lg';
}

export interface ResourceAction<T> {
  icon: IconName;
  label: string;
  danger?: boolean;
  run: (row: T) => void;
  visible?: (row: T) => boolean;
}

/** A field in the create/edit modal. */
export interface ResourceField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date';
  options?: { value: string | number; label: string }[];
  hint?: string;
  required?: boolean;
  span?: 1 | 2;
}

/**
 * Generic admin list screen.
 *
 * Twenty back-office modules are the same screen with different columns:
 * search, filter, table, row actions, and a form modal. Expressing that once
 * keeps each module page to its configuration, and means a change to (say) the
 * empty state or the delete confirmation lands everywhere at once.
 *
 * Modules with genuinely bespoke needs (orders, reservations, inventory, the
 * dashboard) do not use this and are written out in full.
 */
@Component({
  selector: 'app-resource-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ImageComponent,
    EmptyStateComponent,
    SkeletonComponent,
    PaginationComponent,
    ModalComponent,
    ConfirmDialogComponent,
    AdminHeaderComponent,
    AdminToolbarComponent,
    AdminTableComponent,
    RowActionComponent,
    StatusPillComponent,
  ],
  template: `
    <app-admin-header
      [eyebrow]="eyebrow()"
      [title]="title()"
      [description]="description()"
      [actionLabel]="canCreate() ? createLabel() : ''"
      (action)="openCreate()"
    >
      <ng-content select="[headerActions]" />
    </app-admin-header>

    <app-admin-toolbar
      class="mt-6"
      [(search)]="search"
      [placeholder]="searchPlaceholder()"
      [count]="filtered().length"
    >
      <ng-content select="[filters]" />
    </app-admin-toolbar>

    @if (loading()) {
      <app-skeleton class="mt-5" height="26rem" rounded="rounded-2xl" />
    } @else if (!filtered().length) {
      <app-empty-state
        class="mt-5"
        [icon]="emptyIcon()"
        [title]="rows().length ? 'Nothing matches that search' : emptyTitle()"
        [message]="rows().length ? 'Try a different term or clear the search.' : emptyMessage()"
        [actionLabel]="rows().length ? 'Clear search' : canCreate() ? createLabel() : ''"
        (action)="rows().length ? search.set('') : openCreate()"
      />
    } @else {
      <app-admin-table class="mt-5">
        <thead>
          <tr>
            @for (column of columns(); track column.header) {
              <th
                [class.text-right]="column.align === 'right'"
                [class]="hideClass(column)"
              >
                {{ column.header }}
              </th>
            }
            @if (actions().length) {
              <th class="text-right">Actions</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of paged(); track rowId(row)) {
            <tr>
              @for (column of columns(); track column.header) {
                <td [class.text-right]="column.align === 'right'" [class]="hideClass(column)">
                  @switch (column.kind ?? 'text') {
                    @case ('image') {
                      <span class="flex items-center gap-3">
                        <span class="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-ink-200">
                          <app-image
                            [src]="asText(column.value(row))"
                            [alt]="asText(column.sub?.(row)) || 'Item'"
                            sizes="40px"
                            class="h-full w-full"
                          />
                        </span>
                        @if (column.sub) {
                          <span class="min-w-0">
                            <span class="block max-w-48 truncate font-medium text-ink-900">{{
                              column.sub(row)
                            }}</span>
                          </span>
                        }
                      </span>
                    }
                    @case ('status') {
                      <app-status-pill [tone]="column.tone ? column.tone(row) : 'ink'">{{
                        column.value(row)
                      }}</app-status-pill>
                    }
                    @case ('toggle') {
                      <label class="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          class="peer sr-only"
                          [checked]="column.checked?.(row) ?? false"
                          [attr.aria-label]="column.header"
                          (change)="column.onToggle?.(row, $any($event.target).checked)"
                        />
                        <span
                          class="h-5 w-9 rounded-full bg-ink-300 transition-colors peer-checked:bg-clay-600"
                        ></span>
                        <span
                          class="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4"
                        ></span>
                      </label>
                    }
                    @case ('chips') {
                      <span class="flex flex-wrap gap-1.5">
                        @for (chip of column.chips?.(row) ?? []; track chip) {
                          <span class="chip border-ink-300 text-ink-600">{{ chip }}</span>
                        }
                      </span>
                    }
                    @case ('money') {
                      <span class="font-semibold text-clay-700 tabular-nums">{{
                        column.value(row)
                      }}</span>
                    }
                    @case ('strong') {
                      <span class="block max-w-64 truncate font-medium text-ink-900">{{
                        column.value(row)
                      }}</span>
                      @if (column.sub) {
                        <span class="block max-w-64 truncate text-caption text-ink-400">{{
                          column.sub(row)
                        }}</span>
                      }
                    }
                    @case ('muted') {
                      <span class="text-ink-500">{{ column.value(row) }}</span>
                    }
                    @case ('date') {
                      <span class="text-caption">{{ column.value(row) }}</span>
                    }
                    @default {
                      <span>{{ column.value(row) }}</span>
                      @if (column.sub) {
                        <span class="block text-caption text-ink-400">{{ column.sub(row) }}</span>
                      }
                    }
                  }
                </td>
              }

              @if (actions().length) {
                <td>
                  <div class="flex items-center justify-end gap-1.5">
                    @for (action of actions(); track action.label) {
                      @if (!action.visible || action.visible(row)) {
                        <app-row-action
                          [icon]="action.icon"
                          [label]="action.label"
                          [danger]="!!action.danger"
                          (pressed)="action.run(row)"
                        />
                      }
                    }
                    @if (canEdit()) {
                      <app-row-action icon="pen" label="Edit" (pressed)="openEdit(row)" />
                    }
                    @if (canDelete()) {
                      <app-row-action
                        icon="trash"
                        label="Delete"
                        [danger]="true"
                        (pressed)="askDelete(row)"
                      />
                    }
                  </div>
                </td>
              }
            </tr>
          }
        </tbody>
      </app-admin-table>

      <app-pagination
        class="mt-6"
        [page]="page()"
        [totalPages]="totalPages()"
        (pageChange)="page.set($event)"
      />
    }

    <!-- Create / edit -->
    @if (fields().length) {
      <app-modal
        [(open)]="formOpen"
        [title]="editing() ? 'Edit ' + singular() : 'New ' + singular()"
        [width]="600"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          @for (field of fields(); track field.key) {
            <div [class.sm:col-span-2]="(field.span ?? 1) === 2">
              @if (field.type === 'checkbox') {
                <label class="flex cursor-pointer items-center gap-2.5 pt-6 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    class="h-4 w-4 accent-[var(--color-clay-600)]"
                    [checked]="!!draft()[field.key]"
                    (change)="setField(field.key, $any($event.target).checked)"
                  />
                  {{ field.label }}
                </label>
              } @else {
                <label class="field-label" [attr.for]="'f-' + field.key">
                  {{ field.label }}
                  @if (field.required) {
                    <span class="text-clay-600" aria-hidden="true">*</span>
                  }
                </label>
                @switch (field.type) {
                  @case ('textarea') {
                    <textarea
                      [id]="'f-' + field.key"
                      rows="3"
                      class="field resize-none"
                      [value]="asText(draft()[field.key])"
                      (input)="setField(field.key, $any($event.target).value)"
                    ></textarea>
                  }
                  @case ('select') {
                    <select
                      [id]="'f-' + field.key"
                      class="field"
                      [value]="asText(draft()[field.key])"
                      (change)="setField(field.key, $any($event.target).value)"
                    >
                      @for (option of field.options ?? []; track option.value) {
                        <option [value]="option.value">{{ option.label }}</option>
                      }
                    </select>
                  }
                  @case ('number') {
                    <input
                      [id]="'f-' + field.key"
                      type="number"
                      class="field"
                      [value]="asText(draft()[field.key])"
                      (input)="setField(field.key, +$any($event.target).value)"
                    />
                  }
                  @case ('date') {
                    <input
                      [id]="'f-' + field.key"
                      type="date"
                      class="field"
                      [value]="asText(draft()[field.key])"
                      (input)="setField(field.key, $any($event.target).value)"
                    />
                  }
                  @default {
                    <input
                      [id]="'f-' + field.key"
                      type="text"
                      class="field"
                      [value]="asText(draft()[field.key])"
                      (input)="setField(field.key, $any($event.target).value)"
                    />
                  }
                }
                @if (field.hint) {
                  <p class="mt-1.5 text-caption text-ink-500">{{ field.hint }}</p>
                }
              }
            </div>
          }
        </div>

        <div modalFooter class="flex justify-end gap-3">
          <button type="button" class="btn btn-ghost btn-md" (click)="formOpen.set(false)">Cancel</button>
          <button type="button" class="btn btn-primary btn-md" [disabled]="busy()" (click)="save()">
            {{ editing() ? 'Save changes' : 'Create' }}
          </button>
        </div>
      </app-modal>
    }

    <app-confirm-dialog
      [(open)]="confirmOpen"
      [title]="'Delete this ' + singular() + '?'"
      message="This cannot be undone. Anything already referencing it keeps its own copy of the data."
      confirmLabel="Delete"
      [danger]="true"
      (confirmed)="remove()"
    />
  `,
})
export class ResourcePageComponent<T extends { id: ID }> {
  // ---- presentation
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly description = input('');
  readonly singular = input('record');
  readonly createLabel = input('Add new');
  readonly searchPlaceholder = input('Search');
  readonly emptyIcon = input<IconName>('list');
  readonly emptyTitle = input('Nothing here yet');
  readonly emptyMessage = input('Create the first one to get started.');
  readonly perPage = input(15);

  // ---- data
  readonly rows = input.required<T[]>();
  readonly loading = input(false);
  readonly columns = input.required<ResourceColumn<T>[]>();
  readonly actions = input<ResourceAction<T>[]>([]);
  readonly fields = input<ResourceField[]>([]);
  /** Fields searched by the toolbar. */
  readonly searchable = input<(row: T) => string>((row) => JSON.stringify(row));

  // ---- capabilities
  readonly canCreate = input(false);
  readonly canEdit = input(false);
  readonly canDelete = input(false);

  // ---- persistence hooks, supplied by the module page
  readonly onCreate = input<((value: Record<string, unknown>) => Observable<unknown>) | null>(null);
  readonly onUpdate = input<((id: ID, value: Record<string, unknown>) => Observable<unknown>) | null>(
    null,
  );
  readonly onDelete = input<((id: ID) => Observable<unknown>) | null>(null);
  readonly onChanged = input<(() => void) | null>(null);
  /** Seeds the draft when creating. */
  readonly blank = input<Record<string, unknown>>({});

  private readonly toast = inject(ToastService);

  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly formOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly editing = signal<T | null>(null);
  protected readonly draft = signal<Record<string, unknown>>({});
  private readonly pendingDelete = signal<T | null>(null);

  protected readonly filtered = computed(() => {
    const needle = this.search().trim().toLowerCase();
    if (!needle) return this.rows();
    const accessor = this.searchable();
    return this.rows().filter((row) => accessor(row).toLowerCase().includes(needle));
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.perPage())),
  );

  protected readonly paged = computed(() => {
    const start = (Math.min(this.page(), this.totalPages()) - 1) * this.perPage();
    return this.filtered().slice(start, start + this.perPage());
  });

  protected rowId(row: T): ID {
    return row.id;
  }

  protected asText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  protected hideClass(column: ResourceColumn<T>): string {
    return column.hideBelow ? `hidden ${column.hideBelow}:table-cell` : '';
  }

  protected setField(key: string, value: unknown): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.draft.set({ ...this.blank() });
    this.formOpen.set(true);
  }

  protected openEdit(row: T): void {
    this.editing.set(row);
    // Only carry the keys the form actually edits, so a PATCH never sends
    // fields the operator never saw.
    const draft: Record<string, unknown> = {};
    for (const field of this.fields()) {
      draft[field.key] = (row as unknown as Record<string, unknown>)[field.key];
    }
    this.draft.set(draft);
    this.formOpen.set(true);
  }

  protected save(): void {
    const missing = this.fields().filter(
      (f) => f.required && !String(this.draft()[f.key] ?? '').trim(),
    );
    if (missing.length) {
      this.toast.error('Missing details', `${missing.map((f) => f.label).join(', ')} required.`);
      return;
    }

    const editing = this.editing();
    const handler = editing ? this.onUpdate() : this.onCreate();
    if (!handler) {
      this.formOpen.set(false);
      return;
    }

    this.busy.set(true);
    const request = editing
      ? (handler as (id: ID, value: Record<string, unknown>) => Observable<unknown>)(
          editing.id,
          this.draft(),
        )
      : (handler as (value: Record<string, unknown>) => Observable<unknown>)(this.draft());

    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.formOpen.set(false);
        this.onChanged()?.();
        this.toast.success(editing ? 'Changes saved' : `${this.singular()} created`);
      },
      error: () => {
        this.busy.set(false);
        this.toast.error('That did not save', 'Please try again.');
      },
    });
  }

  protected askDelete(row: T): void {
    this.pendingDelete.set(row);
    this.confirmOpen.set(true);
  }

  protected remove(): void {
    const row = this.pendingDelete();
    const handler = this.onDelete();
    if (!row || !handler) return;

    handler(row.id).subscribe({
      next: () => {
        this.onChanged()?.();
        this.toast.info(`${this.singular()} deleted`);
      },
      error: () => this.toast.error('That did not delete'),
    });
  }
}
