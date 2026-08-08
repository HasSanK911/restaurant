import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * SSR-safe wrapper around Web Storage.
 *
 * Every read returns the fallback on the server, and every write is a no-op
 * there, so components can persist state without guarding for platform.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get<T>(key: string, fallback: T): T {
    if (!this.isBrowser) return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      // Corrupt payload (hand-edited, or a schema change between versions).
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage disabled. Losing a cached cart is survivable.
    }
  }

  remove(key: string): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(key);
  }

  session<T>(key: string, fallback: T): T {
    if (!this.isBrowser) return fallback;
    try {
      const raw = sessionStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  setSession<T>(key: string, value: T): void {
    if (!this.isBrowser) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }
}
