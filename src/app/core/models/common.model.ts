/**
 * Primitives shared across every domain model.
 *
 * `id` is a string everywhere so the JSON-Server demo backend and a future
 * Laravel backend (which may return numeric or ULID keys) both fit without
 * touching the Angular layer.
 */
export type ID = string;

/** ISO-8601 date-time string, e.g. `2026-08-07T18:30:00.000Z`. */
export type IsoDateTime = string;

/** ISO-8601 calendar date, e.g. `2026-08-07`. */
export type IsoDate = string;

/** `HH:mm` in 24-hour clock. */
export type ClockTime = string;

export interface Timestamped {
  createdAt: IsoDateTime;
  updatedAt?: IsoDateTime;
}

/** Money is stored in whole PKR rupees. Pakistan has no circulating subunit. */
export type Money = number;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface QueryParams {
  page?: number;
  perPage?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  [key: string]: unknown;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}

/** Discriminated union used by resource signals across the app. */
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

export interface Address {
  id?: ID;
  label?: string;
  line1: string;
  line2?: string;
  area?: string;
  city: string;
  landmark?: string;
  phone?: string;
  isDefault?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}
