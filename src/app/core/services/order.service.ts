import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { API } from '../constants/api.constants';
import { ORDER_STATUS_FLOW } from '../constants/app.constants';
import { ID, Paginated, QueryParams } from '../models/common.model';
import {
  DeliveryArea,
  Order,
  OrderStatus,
  OrderTimelineEntry,
  PlaceOrderPayload,
} from '../models/order.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiService);

  list(params?: QueryParams): Observable<Paginated<Order>> {
    return this.api.list<Order>(API.orders, { _sort: '-createdAt', ...params });
  }

  all(params?: QueryParams): Observable<Order[]> {
    return this.api.all<Order>(API.orders, { _sort: '-createdAt', ...params });
  }

  byId(id: ID): Observable<Order> {
    return this.api.byId<Order>(API.orders, id);
  }

  byReference(reference: string): Observable<Order | undefined> {
    return this.api.byField<Order>(API.orders, 'reference', reference.trim().toUpperCase());
  }

  /**
   * Tracking accepts either the SLT reference or the phone number the order
   * was placed with, because customers reliably remember one of the two.
   */
  track(query: string): Observable<Order[]> {
    const value = query.trim();
    const field = /^SLT-/i.test(value) ? 'reference' : 'customerPhone';
    return this.api.all<Order>(API.orders, {
      [field]: field === 'reference' ? value.toUpperCase() : value,
      _sort: '-createdAt',
    });
  }

  forCustomer(customerId: ID): Observable<Order[]> {
    return this.api.all<Order>(API.orders, { customerId, _sort: '-createdAt' });
  }

  deliveryAreas(): Observable<DeliveryArea[]> {
    return this.api.all<DeliveryArea>(API.deliveryAreas, { isActive: true, _sort: 'name' });
  }

  place(payload: PlaceOrderPayload): Observable<Order> {
    const now = new Date();
    const prep = 25 + Math.min(30, payload.items.length * 4);
    const order: Omit<Order, 'id'> = {
      reference: generateReference(now),
      ...payload,
      status: 'pending',
      estimatedReadyAt: new Date(now.getTime() + prep * 60_000).toISOString(),
      timeline: [
        {
          status: 'pending',
          at: now.toISOString(),
          note: 'Order received. Awaiting confirmation from the restaurant.',
          byName: payload.customerName,
        },
      ],
      placedVia: 'web',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    return this.api.post<Order>(API.orders, order);
  }

  /**
   * Appends a timeline entry and moves the order forward.
   *
   * JSON Server cannot do this atomically, so we read then write. Laravel will
   * expose `POST /orders/{id}/status` and do it in a transaction, which also
   * removes the lost-update race this has today.
   */
  updateStatus(id: ID, status: OrderStatus, note?: string, byName?: string): Observable<Order> {
    return this.byId(id).pipe(
      switchMap((order) => {
        const entry: OrderTimelineEntry = {
          status,
          at: new Date().toISOString(),
          note,
          byName,
        };
        return this.api.patch<Order>(API.orders, id, {
          status,
          timeline: [...order.timeline, entry],
          updatedAt: entry.at,
          ...(status === 'cancelled' && note ? { cancelReason: note } : {}),
        });
      }),
    );
  }

  assignRider(id: ID, riderName: string): Observable<Order> {
    return this.api.patch<Order>(API.orders, id, {
      assignedRiderName: riderName,
      updatedAt: new Date().toISOString(),
    });
  }

  update(id: ID, patch: Partial<Order>): Observable<Order> {
    return this.api.patch<Order>(API.orders, id, { ...patch, updatedAt: new Date().toISOString() });
  }

  remove(id: ID): Observable<unknown> {
    return this.api.delete(API.orders, id);
  }

  /** Live kitchen queue: everything accepted but not yet handed over. */
  kitchenQueue(): Observable<Order[]> {
    return this.api
      .all<Order>(API.orders, { _sort: 'createdAt' })
      .pipe(
        map((orders) =>
          orders.filter((o) => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)),
        ),
      );
  }
}

/** Next status in the flow, or null when the order is terminal. */
export function nextStatus(status: OrderStatus, isDelivery: boolean): OrderStatus | null {
  if (status === 'delivered' || status === 'cancelled') return null;
  const flow = isDelivery ? ORDER_STATUS_FLOW : ORDER_STATUS_FLOW.filter((s) => s !== 'out-for-delivery');
  const index = flow.indexOf(status);
  return index === -1 || index === flow.length - 1 ? null : flow[index + 1];
}

export function statusProgress(status: OrderStatus, isDelivery: boolean): number {
  if (status === 'cancelled') return 0;
  const flow = isDelivery ? ORDER_STATUS_FLOW : ORDER_STATUS_FLOW.filter((s) => s !== 'out-for-delivery');
  const index = flow.indexOf(status);
  return index === -1 ? 0 : Math.round((index / (flow.length - 1)) * 100);
}

function generateReference(now: Date): string {
  // SLT-<day of year><4 random digits>. Readable over the phone, unique enough
  // for a demo. Laravel should use a database sequence instead.
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 864e5);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SLT-${dayOfYear}${rand}`;
}
