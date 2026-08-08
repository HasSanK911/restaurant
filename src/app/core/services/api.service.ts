import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ID, Paginated, QueryParams } from '../models/common.model';

/**
 * The single place that knows how to talk HTTP.
 *
 * Feature services depend on this, never on HttpClient directly. When the
 * Laravel API replaces JSON Server, only `buildParams` and `list` need to
 * change (Laravel returns `{data, meta}`; JSON Server returns a bare array with
 * an `X-Total-Count` header). Everything above this file is untouched.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.buildParams(params) });
  }

  /**
   * Collection read with pagination metadata.
   *
   * JSON Server v1 supports `_page` / `_per_page` and answers with
   * `{ data, items, pages, first, last, next, prev }`. We normalise that into
   * our own `Paginated<T>` so callers never see backend-specific shapes.
   */
  list<T>(path: string, params?: QueryParams): Observable<Paginated<T>> {
    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 12;
    const query = this.buildParams({ ...params, _page: page, _per_page: perPage });
    return this.http
      .get<JsonServerPage<T> | T[]>(this.url(path), { params: query })
      .pipe(map((res) => normalisePage<T>(res, page, perPage)));
  }

  /** Collection read without pagination. Used for small reference lists. */
  all<T>(path: string, params?: QueryParams): Observable<T[]> {
    return this.http.get<T[]>(this.url(path), { params: this.buildParams(params) });
  }

  byId<T>(path: string, id: ID): Observable<T> {
    return this.http.get<T>(`${this.url(path)}/${id}`);
  }

  /**
   * Fetch one record matched on an arbitrary field. JSON Server has no
   * `/resource/slug/:slug` route, so we filter and take the first hit. In
   * Laravel this becomes a route-model binding and the service call is
   * swapped for `byId`.
   */
  byField<T>(path: string, field: string, value: string): Observable<T | undefined> {
    return this.http
      .get<T[]>(this.url(path), { params: new HttpParams().set(field, value) })
      .pipe(map((rows) => rows[0]));
  }

  post<T, B = unknown>(path: string, body: B): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }

  put<T, B = unknown>(path: string, id: ID, body: B): Observable<T> {
    return this.http.put<T>(`${this.url(path)}/${id}`, body);
  }

  patch<T, B = unknown>(path: string, id: ID, body: B): Observable<T> {
    return this.http.patch<T>(`${this.url(path)}/${id}`, body);
  }

  /** PATCH against a singleton resource such as `/restaurant` or `/settings`. */
  patchSingleton<T, B = unknown>(path: string, body: B): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }

  delete<T>(path: string, id: ID): Observable<T> {
    return this.http.delete<T>(`${this.url(path)}/${id}`);
  }

  private url(path: string): string {
    return `${this.base}${path}`;
  }

  private buildParams(params?: Record<string, unknown>): HttpParams {
    let http = new HttpParams();
    if (!params) return http;
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === '') continue;
      // `page`/`perPage` are our own names; the wire names are set by `list`.
      if (key === 'page' || key === 'perPage') continue;
      if (Array.isArray(value)) {
        for (const v of value) http = http.append(key, String(v));
      } else {
        http = http.set(key, String(value));
      }
    }
    return http;
  }
}

interface JsonServerPage<T> {
  data: T[];
  items?: number;
  pages?: number;
}

function normalisePage<T>(
  res: JsonServerPage<T> | T[],
  page: number,
  perPage: number,
): Paginated<T> {
  if (Array.isArray(res)) {
    return { items: res, total: res.length, page, perPage, totalPages: 1 };
  }
  const total = res.items ?? res.data.length;
  return {
    items: res.data,
    total,
    page,
    perPage,
    totalPages: res.pages ?? Math.max(1, Math.ceil(total / perPage)),
  };
}
