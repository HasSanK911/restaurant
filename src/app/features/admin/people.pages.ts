import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ID } from '../../core/models/common.model';
import { Role, StaffMember, User } from '../../core/models/user.model';
import { AdminService } from '../../core/services/admin.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { SkeletonComponent } from '../../shared/components/ui/feedback.components';
import { AdminHeaderComponent } from './shared/admin-ui.components';
import {
  ResourceColumn,
  ResourceField,
  ResourcePageComponent,
} from './shared/resource-page.component';

const shortDate = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '--';

/* -------------------------------------------------------------- customers -- */

@Component({
  selector: 'app-admin-customers-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="People"
      title="Customers"
      description="Everyone with an account. Guest orders are not listed here."
      singular="customer"
      searchPlaceholder="Search by name, email or phone"
      emptyIcon="users"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [searchable]="searchable"
      [canEdit]="false"
      [canDelete]="false"
      [actions]="actions"
      [perPage]="20"
    />
  `,
})
export class AdminCustomersPage {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.customers())),
    { initialValue: [] as User[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<User>[] = [
    { header: 'Customer', kind: 'strong', value: (r) => r.name, sub: (r) => r.email },
    { header: 'Phone', kind: 'muted', value: (r) => r.phone },
    { header: 'Addresses', kind: 'muted', value: (r) => r.addresses.length, hideBelow: 'md' },
    { header: 'Saved dishes', kind: 'muted', value: (r) => r.favouriteItemIds.length, hideBelow: 'lg' },
    { header: 'Loyalty', value: (r) => `${r.loyaltyPoints} pts`, hideBelow: 'md' },
    { header: 'Joined', kind: 'date', value: (r) => shortDate(r.createdAt), hideBelow: 'lg' },
    {
      header: 'Status',
      kind: 'status',
      value: (r) => (r.isActive ? 'Active' : 'Deactivated'),
      tone: (r) => (r.isActive ? 'emerald' : 'ink'),
    },
  ];

  protected readonly actions = [
    {
      icon: 'phone' as const,
      label: 'Call customer',
      run: (row: User) => {
        if (typeof window !== 'undefined') window.location.href = `tel:${row.phone}`;
      },
    },
    {
      icon: 'lock' as const,
      label: 'Deactivate account',
      danger: true,
      visible: (row: User) => row.isActive,
      run: (row: User) => this.setActive(row, false),
    },
    {
      icon: 'check-circle' as const,
      label: 'Reactivate account',
      visible: (row: User) => !row.isActive,
      run: (row: User) => this.setActive(row, true),
    },
  ];

  protected readonly searchable = (r: User) => `${r.name} ${r.email} ${r.phone}`;

  constructor() {
    this.seo.apply({ title: 'Customers | Salateen Admin', description: '', path: 'admin/customers', noIndex: true });
  }

  private setActive(row: User, isActive: boolean): void {
    this.admin.updateUser(row.id, { isActive }).subscribe(() => {
      this.reload.update((n) => n + 1);
      this.toast.success(isActive ? 'Account reactivated' : 'Account deactivated');
    });
  }
}

/* ------------------------------------------------------------------ staff -- */

@Component({
  selector: 'app-admin-staff-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="People"
      title="Staff"
      description="The team on the floor, in the kitchen and on the road."
      singular="staff member"
      createLabel="Add staff"
      searchPlaceholder="Search by name or role"
      emptyIcon="badge"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [fields]="fields"
      [searchable]="searchable"
      [canCreate]="true"
      [canEdit]="true"
      [canDelete]="true"
      [blank]="blank"
      [onCreate]="create"
      [onUpdate]="update"
      [onDelete]="remove"
      [onChanged]="refresh"
    />
  `,
})
export class AdminStaffPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.staff())),
    { initialValue: [] as StaffMember[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<StaffMember>[] = [
    { header: 'Name', kind: 'strong', value: (r) => r.name, sub: (r) => r.designation },
    { header: 'Department', kind: 'muted', value: (r) => this.humanise(r.department) },
    { header: 'Shift', kind: 'muted', value: (r) => this.humanise(r.shift), hideBelow: 'md' },
    { header: 'Phone', kind: 'muted', value: (r) => r.phone, hideBelow: 'md' },
    { header: 'Joined', kind: 'date', value: (r) => shortDate(r.joinedAt), hideBelow: 'lg' },
    {
      header: 'Status',
      kind: 'status',
      value: (r) => (r.isActive ? 'Active' : 'Left'),
      tone: (r) => (r.isActive ? 'emerald' : 'ink'),
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'name', label: 'Full name', required: true },
    { key: 'designation', label: 'Designation', required: true },
    {
      key: 'department',
      label: 'Department',
      type: 'select',
      options: [
        { value: 'kitchen', label: 'Kitchen' },
        { value: 'service', label: 'Service' },
        { value: 'delivery', label: 'Delivery' },
        { value: 'management', label: 'Management' },
        { value: 'housekeeping', label: 'Housekeeping' },
      ],
    },
    {
      key: 'shift',
      label: 'Shift',
      type: 'select',
      options: [
        { value: 'morning', label: 'Morning' },
        { value: 'evening', label: 'Evening' },
        { value: 'split', label: 'Split' },
        { value: 'night', label: 'Night' },
      ],
    },
    { key: 'phone', label: 'Phone', required: true },
    { key: 'salary', label: 'Monthly salary (Rs)', type: 'number' },
    { key: 'isActive', label: 'Currently employed', type: 'checkbox' },
  ];

  protected readonly blank = {
    name: '',
    designation: '',
    department: 'kitchen',
    shift: 'evening',
    phone: '',
    salary: 40000,
    isActive: true,
    userId: null,
    photo: null,
  };

  protected readonly searchable = (r: StaffMember) => `${r.name} ${r.designation} ${r.department}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createStaff({
      ...this.blank,
      joinedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...value,
    } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateStaff(id, value as never);
  protected readonly remove = (id: ID) => this.admin.deleteStaff(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({ title: 'Staff | Salateen Admin', description: '', path: 'admin/staff', noIndex: true });
  }

  private humanise(value: string): string {
    return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/* ------------------------------------------------------------------ users -- */

@Component({
  selector: 'app-admin-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="People"
      title="Users"
      description="Accounts that can sign in, and what role each one holds."
      singular="user"
      createLabel="Add user"
      searchPlaceholder="Search by name, email or role"
      emptyIcon="user"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [fields]="fields"
      [searchable]="searchable"
      [canCreate]="true"
      [canEdit]="true"
      [canDelete]="true"
      [blank]="blank"
      [onCreate]="create"
      [onUpdate]="update"
      [onDelete]="remove"
      [onChanged]="refresh"
      [perPage]="20"
    />
  `,
})
export class AdminUsersPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);
  private readonly reload = signal(0);

  protected readonly rows = toSignal(
    toObservable(this.reload).pipe(switchMap(() => this.admin.users())),
    { initialValue: [] as User[] },
  );
  protected readonly loading = computed(() => this.rows().length === 0 && this.reload() === 0);

  protected readonly columns: ResourceColumn<User>[] = [
    { header: 'User', kind: 'strong', value: (r) => r.name, sub: (r) => r.email },
    { header: 'Phone', kind: 'muted', value: (r) => r.phone, hideBelow: 'md' },
    {
      header: 'Role',
      kind: 'status',
      value: (r) => this.roleLabel(r.roleSlug),
      tone: (r) => (r.roleSlug === 'admin' ? 'clay' : r.roleSlug === 'customer' ? 'ink' : 'basil'),
    },
    { header: 'Last seen', kind: 'date', value: (r) => shortDate(r.lastLoginAt), hideBelow: 'lg' },
    {
      header: 'Active',
      kind: 'toggle',
      value: () => '',
      checked: (r) => r.isActive,
      onToggle: (r, v) => this.patch(r.id, { isActive: v }),
    },
  ];

  protected readonly fields: ResourceField[] = [
    { key: 'name', label: 'Full name', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Phone', required: true },
    {
      key: 'roleSlug',
      label: 'Role',
      type: 'select',
      options: [
        { value: 'admin', label: 'Administrator' },
        { value: 'manager', label: 'Restaurant Manager' },
        { value: 'staff', label: 'Floor Staff' },
        { value: 'kitchen', label: 'Kitchen' },
        { value: 'rider', label: 'Delivery Rider' },
        { value: 'customer', label: 'Customer' },
      ],
    },
    { key: 'password', label: 'Password', hint: 'Demo only. Sanctum replaces this in production.' },
    { key: 'isActive', label: 'Can sign in', type: 'checkbox' },
  ];

  protected readonly blank = {
    name: '',
    email: '',
    phone: '',
    roleSlug: 'staff',
    password: 'salateen123',
    isActive: true,
  };

  protected readonly searchable = (r: User) => `${r.name} ${r.email} ${r.phone} ${r.roleSlug}`;
  protected readonly create = (value: Record<string, unknown>) =>
    this.admin.createUser({
      ...this.blank,
      addresses: [],
      favouriteItemIds: [],
      loyaltyPoints: 0,
      preferences: { marketingEmails: false, orderUpdates: true, smsAlerts: true, language: 'en' },
      createdAt: new Date().toISOString(),
      ...value,
    } as never);
  protected readonly update = (id: ID, value: Record<string, unknown>) =>
    this.admin.updateUser(id, value as never);
  protected readonly remove = (id: ID) => this.admin.deleteUser(id);
  protected readonly refresh = () => this.reload.update((n) => n + 1);

  constructor() {
    this.seo.apply({ title: 'Users | Salateen Admin', description: '', path: 'admin/users', noIndex: true });
  }

  private roleLabel(slug: string): string {
    return {
      admin: 'Administrator',
      manager: 'Manager',
      staff: 'Floor Staff',
      kitchen: 'Kitchen',
      rider: 'Rider',
      customer: 'Customer',
    }[slug] ?? slug;
  }

  private patch(id: ID, value: Partial<User>): void {
    this.admin.updateUser(id, value).subscribe(() => this.refresh());
  }
}

/* ------------------------------------------------------------------ roles -- */

@Component({
  selector: 'app-admin-roles-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResourcePageComponent],
  template: `
    <app-resource-page
      eyebrow="People"
      title="Roles"
      description="What each role is allowed to do. System roles cannot be deleted."
      singular="role"
      searchPlaceholder="Search roles"
      emptyIcon="shield"
      [rows]="rows()"
      [loading]="loading()"
      [columns]="columns"
      [searchable]="searchable"
    />
  `,
})
export class AdminRolesPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);

  protected readonly rows = toSignal(this.admin.roles(), { initialValue: [] as Role[] });
  protected readonly loading = computed(() => this.rows().length === 0);

  protected readonly columns: ResourceColumn<Role>[] = [
    { header: 'Role', kind: 'strong', value: (r) => r.name, sub: (r) => r.slug },
    { header: 'Description', kind: 'muted', value: (r) => r.description, hideBelow: 'md' },
    {
      header: 'Permissions',
      value: (r) => (r.permissions.includes('*') ? 'Everything' : `${r.permissions.length} granted`),
    },
    {
      header: 'Type',
      kind: 'status',
      value: (r) => (r.isSystem ? 'System' : 'Custom'),
      tone: (r) => (r.isSystem ? 'ink' : 'clay'),
    },
  ];

  protected readonly searchable = (r: Role) => `${r.name} ${r.slug} ${r.description}`;

  constructor() {
    this.seo.apply({ title: 'Roles | Salateen Admin', description: '', path: 'admin/roles', noIndex: true });
  }
}

/* ------------------------------------------------------------ permissions -- */

interface PermissionRow {
  id: ID;
  key: string;
  module: string;
  action: string;
  label: string;
}

@Component({
  selector: 'app-admin-permissions-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SkeletonComponent, AdminHeaderComponent],
  template: `
    <app-admin-header
      eyebrow="People"
      title="Permissions"
      description="Every capability in the system, and which roles hold it. Edit a role to change these."
    />

    @if (!permissions().length) {
      <app-skeleton class="mt-7" height="24rem" rounded="rounded-2xl" />
    } @else {
      <div class="panel mt-7 overflow-x-auto">
        <table class="table-lux">
          <thead>
            <tr>
              <th>Capability</th>
              @for (role of roles(); track role.id) {
                <th class="text-center">{{ role.name }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (group of grouped(); track group.module) {
              <tr class="bg-ink-50">
                <td [attr.colspan]="roles().length + 1" class="font-semibold text-ink-900">
                  {{ humanise(group.module) }}
                </td>
              </tr>
              @for (permission of group.items; track permission.id) {
                <tr>
                  <td>
                    <span class="font-mono text-caption text-ink-600">{{ permission.key }}</span>
                  </td>
                  @for (role of roles(); track role.id) {
                    <td class="text-center">
                      @if (has(role, permission.key)) {
                        <app-icon
                          name="check"
                          [size]="15"
                          [strokeWidth]="2.6"
                          class="mx-auto text-basil-600"
                          [label]="role.name + ' can ' + permission.key"
                        />
                      } @else {
                        <span class="text-ink-300" aria-label="Not granted">&mdash;</span>
                      }
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class AdminPermissionsPage {
  private readonly admin = inject(AdminService);
  private readonly seo = inject(SeoService);

  protected readonly permissions = toSignal(this.admin.permissions(), {
    initialValue: [] as PermissionRow[],
  });
  protected readonly roles = toSignal(this.admin.roles(), { initialValue: [] as Role[] });

  protected readonly grouped = computed(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const permission of this.permissions()) {
      const list = map.get(permission.module) ?? [];
      list.push(permission);
      map.set(permission.module, list);
    }
    return [...map.entries()].map(([module, items]) => ({ module, items }));
  });

  constructor() {
    this.seo.apply({
      title: 'Permissions | Salateen Admin',
      description: '',
      path: 'admin/permissions',
      noIndex: true,
    });
  }

  protected has(role: Role, key: string): boolean {
    return role.permissions.includes('*') || role.permissions.includes(key);
  }

  protected humanise(value: string): string {
    return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
