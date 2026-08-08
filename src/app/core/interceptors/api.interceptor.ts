import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, throwError, timeout, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiError } from '../models/common.model';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

const SILENT_PATHS = ['/notifications', '/dashboardStats', '/analytics'];

/**
 * Attaches auth headers, applies a timeout, retries idempotent reads once on
 * transient failure, and normalises every failure into `ApiError`.
 *
 * The Laravel migration only changes the token scheme here (Sanctum bearer vs
 * this demo's fake token) and adds CSRF handling for the cookie-based flow.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);

  const isApiCall = req.url.startsWith(environment.apiUrl);
  const token = auth.session()?.token;

  const request = isApiCall
    ? req.clone({
        setHeaders: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
    : req;

  return next(request).pipe(
    timeout(environment.requestTimeoutMs),
    retry({
      count: request.method === 'GET' ? environment.retryCount : 0,
      // Exponential-ish backoff, and never retry a client error.
      delay: (error, retryIndex) => {
        if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
          throw error;
        }
        return timer(300 * retryIndex);
      },
    }),
    catchError((error: unknown) => {
      const apiError = toApiError(error);
      const silent = SILENT_PATHS.some((p) => request.url.includes(p));
      if (!silent && apiError.status !== 404) {
        toast.error(errorTitle(apiError.status), apiError.message);
      }
      return throwError(() => apiError);
    }),
  );
};

function errorTitle(status: number): string {
  if (status === 0) return 'Cannot reach the server';
  if (status === 401) return 'Please sign in again';
  if (status === 403) return 'Not permitted';
  if (status >= 500) return 'Something went wrong';
  return 'Request failed';
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return {
        status: 0,
        message:
          'We could not reach the API. Start the demo backend with "npm run api" and try again.',
      };
    }
    const body = error.error as { message?: string; errors?: Record<string, string[]> } | null;
    return {
      status: error.status,
      message: body?.message ?? error.statusText ?? 'The request could not be completed.',
      errors: body?.errors,
    };
  }
  if (error instanceof Error) {
    const isTimeout = error.name === 'TimeoutError';
    return {
      status: isTimeout ? 408 : 500,
      message: isTimeout ? 'The request took too long. Please try again.' : error.message,
    };
  }
  return { status: 500, message: 'An unexpected error occurred.' };
}
