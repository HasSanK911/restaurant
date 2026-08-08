import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, shareReplay } from 'rxjs';
import { API } from '../constants/api.constants';
import { DAY_NAMES } from '../constants/app.constants';
import {
  AppSettings,
  OpeningHour,
  RestaurantProfile,
  WorkingHoursStatus,
} from '../models/restaurant.model';
import { ApiService } from './api.service';

/**
 * Restaurant profile and settings, loaded once and shared app-wide.
 *
 * Both are singleton resources, so they are fetched eagerly and exposed as
 * signals. Components read `profile()` synchronously and render a skeleton
 * while it is null.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private readonly api = inject(ApiService);

  /** Ticks every minute so the open/closed badge stays truthful. */
  private readonly clock = signal(Date.now());

  readonly profile = toSignal(
    this.api.get<RestaurantProfile>(API.restaurant).pipe(
      catchError(() => of(null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    ),
    { initialValue: null },
  );

  readonly settings = toSignal(
    this.api.get<AppSettings>(API.settings).pipe(
      catchError(() => of(null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    ),
    { initialValue: null },
  );

  readonly hours = computed(() => this.profile()?.openingHours ?? []);

  readonly status = computed<WorkingHoursStatus>(() => {
    const hours = this.hours();
    this.clock();
    if (!hours.length) return { isOpen: false, label: 'Hours loading' };
    return evaluateHours(hours, new Date());
  });

  constructor() {
    if (typeof window !== 'undefined') {
      setInterval(() => this.clock.set(Date.now()), 60_000);
    }
  }

  update(profile: Partial<RestaurantProfile>) {
    return this.api.patchSingleton<RestaurantProfile>(API.restaurant, profile);
  }

  updateSettings(settings: Partial<AppSettings>) {
    return this.api.patchSingleton<AppSettings>(API.settings, settings);
  }
}

/**
 * Works out whether the restaurant is open right now.
 *
 * Salateen closes at 00:00, i.e. `closesNextDay` is true for every day, so a
 * naive `now >= opensAt && now < closesAt` comparison would report closed for
 * the entire evening. This walks yesterday's window too.
 */
export function evaluateHours(hours: OpeningHour[], now: Date): WorkingHoursStatus {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const today = hours.find((h) => h.day === now.getDay());
  const yesterday = hours.find((h) => h.day === (now.getDay() + 6) % 7);

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  // Still inside yesterday's after-midnight tail?
  if (yesterday && !yesterday.isClosed && yesterday.closesNextDay) {
    const close = toMinutes(yesterday.closesAt);
    if (close > 0 && minutesNow < close) {
      return {
        isOpen: true,
        label: `Open now, closes ${fmt(yesterday.closesAt)}`,
        today,
      };
    }
  }

  if (!today || today.isClosed) {
    const next = nextOpenDay(hours, now.getDay());
    return {
      isOpen: false,
      label: next ? `Closed today, opens ${next.dayName} ${fmt(next.opensAt)}` : 'Closed today',
      today,
    };
  }

  const open = toMinutes(today.opensAt);
  const close = today.closesNextDay ? 24 * 60 : toMinutes(today.closesAt);

  if (minutesNow < open) {
    return { isOpen: false, label: `Opens ${fmt(today.opensAt)}`, today };
  }
  if (minutesNow < close) {
    return { isOpen: true, label: `Open now, closes ${fmt(today.closesAt)}`, today };
  }
  const next = nextOpenDay(hours, now.getDay());
  return {
    isOpen: false,
    label: next ? `Closed, opens ${next.dayName} ${fmt(next.opensAt)}` : 'Closed',
    today,
  };
}

function nextOpenDay(hours: OpeningHour[], fromDay: number): OpeningHour | undefined {
  for (let i = 1; i <= 7; i++) {
    const day = (fromDay + i) % 7;
    const entry = hours.find((h) => h.day === day);
    if (entry && !entry.isClosed) return { ...entry, dayName: DAY_NAMES[day] };
  }
  return undefined;
}
