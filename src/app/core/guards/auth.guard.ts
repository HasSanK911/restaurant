import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Permission, RoleSlug } from '../models/user.model';

/** Requires any signed-in user. Bounces to login with a return URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps signed-in users off the login and register pages. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree([auth.isAdminSide() ? '/admin' : '/account']);
};

/** Requires one of the given roles. */
export const roleGuard = (...roles: RoleSlug[]): CanActivateFn => {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    }
    if (auth.hasRole(...roles)) return true;

    toast.error('Not permitted', 'Your account does not have access to that area.');
    return router.createUrlTree([auth.isAdminSide() ? '/admin' : '/']);
  };
};

/** Requires a specific `module.action` permission. */
export const permissionGuard = (permission: Permission): CanActivateFn => {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    }
    if (auth.can(permission)) return true;

    toast.error('Not permitted', `You need the "${permission}" permission to open that page.`);
    return router.createUrlTree(['/admin']);
  };
};

/** Anything under /admin: signed in and holding an admin-side role. */
export const adminGuard: CanActivateFn = (route, state) =>
  roleGuard('admin', 'manager', 'staff', 'kitchen')(route, state);
