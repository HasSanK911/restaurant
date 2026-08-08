import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CartService } from '../services/cart.service';
import { ToastService } from '../services/toast.service';

/** Checkout with an empty basket is a dead end, so redirect to the menu. */
export const cartNotEmptyGuard: CanActivateFn = () => {
  const cart = inject(CartService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!cart.isEmpty()) return true;

  toast.info('Your basket is empty', 'Add something from the menu before checking out.');
  return router.createUrlTree(['/menu']);
};
