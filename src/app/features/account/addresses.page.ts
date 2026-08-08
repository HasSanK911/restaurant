import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { Address } from '../../core/models/common.model';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { normalisePhone, pakPhoneValidator, revealErrors } from '../../shared/validators/form.validators';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { BadgeComponent } from '../../shared/components/ui/display.components';
import { EmptyStateComponent } from '../../shared/components/ui/feedback.components';
import { FieldComponent } from '../../shared/components/ui/form.components';
import { ConfirmDialogComponent, ModalComponent } from '../../shared/components/ui/overlay.components';
import { DeliveryArea } from '../../core/models/order.model';

@Component({
  selector: 'app-account-addresses-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IconComponent,
    BadgeComponent,
    EmptyStateComponent,
    FieldComponent,
    ModalComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="font-display text-2xl">Delivery addresses</h2>
        <p class="mt-1.5 text-sm text-ink-600">
          Saved addresses appear at checkout so you do not have to type them again.
        </p>
      </div>
      <button type="button" class="btn btn-primary btn-md" (click)="openNew()">
        <app-icon name="plus" [size]="15" [strokeWidth]="2.4" />
        Add address
      </button>
    </div>

    @if (addresses().length) {
      <ul class="mt-7 grid gap-4 sm:grid-cols-2">
        @for (address of addresses(); track address.id) {
          <li>
            <article class="panel flex h-full flex-col p-5">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-2.5">
                  <span
                    class="flex h-9 w-9 items-center justify-center rounded-xl border border-clay-600/20 bg-clay-50 text-clay-700"
                  >
                    <app-icon name="map" [size]="16" />
                  </span>
                  <span class="font-semibold text-ink-900">{{ address.label || 'Address' }}</span>
                </div>
                @if (address.isDefault) {
                  <app-badge tone="clay">Default</app-badge>
                }
              </div>

              <address class="mt-4 flex-1 text-sm leading-relaxed text-ink-600 not-italic">
                {{ address.line1 }}<br />
                @if (address.landmark) {
                  {{ address.landmark }}<br />
                }
                {{ address.area }}, {{ address.city }}
                @if (address.phone) {
                  <br />{{ address.phone }}
                }
              </address>

              <div class="mt-5 flex flex-wrap gap-2 border-t border-ink-200 pt-4">
                <button type="button" class="btn btn-secondary btn-sm" (click)="openEdit(address)">
                  <app-icon name="pen" [size]="12" />
                  Edit
                </button>
                @if (!address.isDefault) {
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm border border-ink-300"
                    (click)="makeDefault(address)"
                  >
                    Make default
                  </button>
                }
                <button
                  type="button"
                  class="btn btn-ghost btn-sm ml-auto text-red-600 hover:bg-red-50"
                  [attr.aria-label]="'Delete ' + (address.label || 'address')"
                  (click)="askDelete(address)"
                >
                  <app-icon name="trash" [size]="13" />
                </button>
              </div>
            </article>
          </li>
        }
      </ul>
    } @else {
      <app-empty-state
        class="mt-7"
        icon="map"
        title="No saved addresses"
        message="Add one now, or save it as you go through checkout."
        actionLabel="Add an address"
        (action)="openNew()"
      />
    }

    <!-- Editor -->
    <app-modal
      [(open)]="editorOpen"
      [title]="editing() ? 'Edit address' : 'Add an address'"
      subtitle="We only use this to deliver your order."
      [width]="560"
    >
      <form [formGroup]="form" class="space-y-4">
        <app-field label="Label" [control]="form.controls.label" fieldId="a-label" hint="Home, Office, Shop...">
          <input id="a-label" type="text" class="field" formControlName="label" />
        </app-field>
        <app-field
          label="Address"
          [required]="true"
          [control]="form.controls.line1"
          fieldId="a-line1"
        >
          <input
            id="a-line1"
            type="text"
            class="field"
            formControlName="line1"
            placeholder="House number and street"
          />
        </app-field>
        <app-field label="Landmark" [control]="form.controls.landmark" fieldId="a-landmark">
          <input
            id="a-landmark"
            type="text"
            class="field"
            formControlName="landmark"
            placeholder="Near the Jamia Masjid"
          />
        </app-field>
        <div class="grid gap-4 sm:grid-cols-2">
          <app-field label="Area" [required]="true" [control]="form.controls.area" fieldId="a-area">
            <select id="a-area" class="field" formControlName="area">
              <option value="">Choose an area</option>
              @for (area of areas(); track area.id) {
                <option [value]="area.name">{{ area.name }}</option>
              }
            </select>
          </app-field>
          <app-field label="City" [required]="true" [control]="form.controls.city" fieldId="a-city">
            <input id="a-city" type="text" class="field" formControlName="city" />
          </app-field>
        </div>
        <app-field label="Contact number" [control]="form.controls.phone" fieldId="a-phone">
          <input id="a-phone" type="tel" class="field" formControlName="phone" placeholder="0312-0991116" />
        </app-field>
        <label class="flex cursor-pointer items-center gap-2.5 text-sm text-ink-600">
          <input type="checkbox" class="h-4 w-4 accent-[var(--color-clay-600)]" formControlName="isDefault" />
          Use this as my default address
        </label>
      </form>

      <div modalFooter class="flex justify-end gap-3">
        <button type="button" class="btn btn-ghost btn-md" (click)="editorOpen.set(false)">Cancel</button>
        <button type="button" class="btn btn-primary btn-md" [disabled]="saving()" (click)="save()">
          {{ editing() ? 'Save changes' : 'Add address' }}
        </button>
      </div>
    </app-modal>

    <app-confirm-dialog
      [(open)]="confirmOpen"
      title="Delete this address?"
      message="It will be removed from your account. Any past orders keep the address they were delivered to."
      confirmLabel="Delete"
      [danger]="true"
      (confirmed)="remove()"
    />
  `,
})
export class AccountAddressesPage {
  private readonly auth = inject(AuthService);
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);

  protected readonly editorOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly editing = signal<Address | null>(null);
  private readonly pendingDelete = signal<Address | null>(null);
  private readonly reload = signal(0);

  protected readonly areas = toSignal(this.orders.deliveryAreas(), {
    initialValue: [] as DeliveryArea[],
  });

  private readonly record = toSignal(
    toObservable(computed(() => `${this.auth.user()?.id}:${this.reload()}`)).pipe(
      switchMap(() => this.auth.currentUserRecord()),
    ),
    { initialValue: null as User | null },
  );

  protected readonly addresses = computed(() => this.record()?.addresses ?? []);

  protected readonly form = this.fb.nonNullable.group({
    label: ['Home'],
    line1: ['', [Validators.required, Validators.minLength(6)]],
    landmark: [''],
    area: ['', [Validators.required]],
    city: ['Swabi', [Validators.required]],
    phone: ['', [pakPhoneValidator()]],
    isDefault: [false],
  });

  constructor() {
    this.seo.apply({
      title: 'Delivery Addresses | Salateen Restaurant Swabi',
      description: 'Manage the addresses we deliver your orders to.',
      path: 'account/addresses',
      noIndex: true,
    });
  }

  protected openNew(): void {
    this.editing.set(null);
    this.form.reset({ label: 'Home', city: 'Swabi', isDefault: this.addresses().length === 0 });
    this.editorOpen.set(true);
  }

  protected openEdit(address: Address): void {
    this.editing.set(address);
    this.form.reset({
      label: address.label ?? '',
      line1: address.line1,
      landmark: address.landmark ?? '',
      area: address.area ?? '',
      city: address.city,
      phone: address.phone ?? '',
      isDefault: !!address.isDefault,
    });
    this.editorOpen.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      revealErrors(this.form);
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const editing = this.editing();

    const next: Address = {
      id: editing?.id ?? `addr-${Date.now()}`,
      label: value.label.trim() || 'Address',
      line1: value.line1.trim(),
      landmark: value.landmark.trim() || undefined,
      area: value.area,
      city: value.city.trim(),
      phone: value.phone ? normalisePhone(value.phone) : undefined,
      isDefault: value.isDefault,
    };

    let list = this.addresses().map((a) => ({ ...a }));
    if (editing) list = list.map((a) => (a.id === editing.id ? next : a));
    else list.push(next);

    // Exactly one default, always.
    if (next.isDefault) list = list.map((a) => ({ ...a, isDefault: a.id === next.id }));
    else if (!list.some((a) => a.isDefault) && list.length) list[0].isDefault = true;

    this.persist(list, editing ? 'Address updated' : 'Address added');
  }

  protected makeDefault(address: Address): void {
    const list = this.addresses().map((a) => ({ ...a, isDefault: a.id === address.id }));
    this.persist(list, 'Default address updated');
  }

  protected askDelete(address: Address): void {
    this.pendingDelete.set(address);
    this.confirmOpen.set(true);
  }

  protected remove(): void {
    const target = this.pendingDelete();
    if (!target) return;
    let list = this.addresses().filter((a) => a.id !== target.id);
    if (target.isDefault && list.length) list = list.map((a, i) => ({ ...a, isDefault: i === 0 }));
    this.persist(list, 'Address deleted');
  }

  private persist(addresses: Address[], message: string): void {
    this.auth.updateProfile({ addresses }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editorOpen.set(false);
        this.reload.update((n) => n + 1);
        this.toast.success(message);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('That did not save', 'Please try again.');
      },
    });
  }
}
