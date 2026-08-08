import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, map, of, switchMap, throwError } from 'rxjs';
import { API, STORAGE_KEYS } from '../constants/api.constants';
import { ID } from '../models/common.model';
import {
  AuthSession,
  AuthUser,
  LoginPayload,
  Permission,
  RegisterPayload,
  Role,
  RoleSlug,
  User,
} from '../models/user.model';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

const ADMIN_ROLES: RoleSlug[] = ['admin', 'manager', 'staff', 'kitchen'];

/**
 * Mock authentication against JSON Server.
 *
 * WARNING, DEMO ONLY. Credentials are compared client-side against db.json and
 * the "token" is a base64 stamp with no signature. This exists so the demo can
 * show role-gated UI end to end. Every method here is replaced by a Sanctum
 * call in production; the public surface (signals + method signatures) is
 * designed not to change. See MIGRATION_GUIDE.md, section "Authentication".
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly storage = inject(StorageService);

  private readonly _session = signal<AuthSession | null>(
    this.storage.get<AuthSession | null>(STORAGE_KEYS.session, null),
  );

  readonly session = this._session.asReadonly();
  readonly user = computed<AuthUser | null>(() => this._session()?.user ?? null);
  readonly isAuthenticated = computed(() => {
    const session = this._session();
    if (!session) return false;
    return new Date(session.expiresAt).getTime() > Date.now();
  });
  readonly role = computed<RoleSlug | null>(() => this.user()?.roleSlug ?? null);
  readonly isAdminSide = computed(() => {
    const role = this.role();
    return role !== null && ADMIN_ROLES.includes(role);
  });
  readonly isCustomer = computed(() => this.role() === 'customer');
  readonly initials = computed(() => {
    const name = this.user()?.name ?? '';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  });

  constructor() {
    effect(() => {
      const session = this._session();
      if (session) this.storage.set(STORAGE_KEYS.session, session);
      else this.storage.remove(STORAGE_KEYS.session);
    });
  }

  can(permission: Permission): boolean {
    const perms = this.user()?.permissions ?? [];
    return perms.includes('*') || perms.includes(permission);
  }

  canAny(permissions: Permission[]): boolean {
    return permissions.some((p) => this.can(p));
  }

  hasRole(...roles: RoleSlug[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  login({ email, password }: LoginPayload): Observable<AuthSession> {
    return this.api
      .all<User>(API.users, { email: email.trim().toLowerCase() })
      .pipe(
        switchMap((users) => {
          const user = users[0];
          if (!user || user.password !== password) {
            return throwError(() => new Error('Those details do not match an account.'));
          }
          if (!user.isActive) {
            return throwError(() => new Error('This account has been deactivated.'));
          }
          return this.buildSession(user);
        }),
      );
  }

  register(payload: RegisterPayload): Observable<AuthSession> {
    const email = payload.email.trim().toLowerCase();
    return this.api.all<User>(API.users, { email }).pipe(
      switchMap((existing) => {
        if (existing.length) {
          return throwError(() => new Error('An account with that email already exists.'));
        }
        const now = new Date().toISOString();
        const user: Omit<User, 'id'> = {
          name: payload.name.trim(),
          email,
          phone: payload.phone.trim(),
          password: payload.password,
          roleSlug: 'customer',
          isActive: true,
          addresses: [],
          favouriteItemIds: [],
          loyaltyPoints: 0,
          preferences: {
            marketingEmails: true,
            orderUpdates: true,
            smsAlerts: true,
            language: 'en',
          },
          createdAt: now,
          updatedAt: now,
        };
        return this.api.post<User>(API.users, user).pipe(switchMap((created) => this.buildSession(created)));
      }),
    );
  }

  logout(): void {
    this._session.set(null);
  }

  /** Reloads the signed-in user so profile edits appear immediately. */
  refresh(): Observable<AuthUser | null> {
    const id = this.user()?.id;
    if (!id) return of(null);
    return this.api.byId<User>(API.users, id).pipe(
      switchMap((user) => this.buildSession(user)),
      map((session) => session.user),
    );
  }

  currentUserRecord(): Observable<User | null> {
    const id = this.user()?.id;
    return id ? this.api.byId<User>(API.users, id) : of(null);
  }

  updateProfile(patch: Partial<User>): Observable<User> {
    const id = this.user()?.id;
    if (!id) return throwError(() => new Error('You are not signed in.'));
    return this.api
      .patch<User>(API.users, id, { ...patch, updatedAt: new Date().toISOString() })
      .pipe(
        switchMap((user) => this.buildSession(user).pipe(map(() => user))),
      );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<User> {
    const id = this.user()?.id;
    if (!id) return throwError(() => new Error('You are not signed in.'));
    return this.api.byId<User>(API.users, id).pipe(
      switchMap((user) => {
        if (user.password !== currentPassword) {
          return throwError(() => new Error('Your current password is not correct.'));
        }
        return this.api.patch<User>(API.users, id, {
          password: newPassword,
          updatedAt: new Date().toISOString(),
        });
      }),
    );
  }

  toggleFavourite(menuItemId: ID): Observable<User | null> {
    const current = this.user();
    if (!current) return of(null);
    return this.api.byId<User>(API.users, current.id).pipe(
      switchMap((user) => {
        const favourites = user.favouriteItemIds.includes(menuItemId)
          ? user.favouriteItemIds.filter((id) => id !== menuItemId)
          : [...user.favouriteItemIds, menuItemId];
        return this.api.patch<User>(API.users, user.id, { favouriteItemIds: favourites });
      }),
    );
  }

  private buildSession(user: User): Observable<AuthSession> {
    return this.api.all<Role>(API.roles, { slug: user.roleSlug }).pipe(
      map((roles) => {
        const permissions = roles[0]?.permissions ?? [];
        const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
        const session: AuthSession = {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            roleSlug: user.roleSlug,
            avatar: user.avatar,
            permissions,
          },
          token: btoa(`${user.id}:${user.email}:${expiresAt}`),
          expiresAt,
        };
        this._session.set(session);
        return session;
      }),
    );
  }
}
