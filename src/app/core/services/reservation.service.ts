import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { API } from '../constants/api.constants';
import { ClockTime, ID, IsoDate, Paginated, QueryParams } from '../models/common.model';
import {
  AvailabilitySlot,
  Reservation,
  ReservationPayload,
  ReservationStatus,
  RestaurantTable,
  TableZone,
} from '../models/reservation.model';
import { ApiService } from './api.service';

/** Service window, in 30-minute steps. Lunch and dinner sittings. */
const SLOT_TIMES: ClockTime[] = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30',
];

const HOLDS_TABLE: ReservationStatus[] = ['pending', 'confirmed', 'seated'];

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly api = inject(ApiService);

  list(params?: QueryParams): Observable<Paginated<Reservation>> {
    return this.api.list<Reservation>(API.reservations, { _sort: '-date', ...params });
  }

  all(params?: QueryParams): Observable<Reservation[]> {
    return this.api.all<Reservation>(API.reservations, { _sort: '-date', ...params });
  }

  byId(id: ID): Observable<Reservation> {
    return this.api.byId<Reservation>(API.reservations, id);
  }

  byReference(reference: string): Observable<Reservation | undefined> {
    return this.api.byField<Reservation>(API.reservations, 'reference', reference.trim().toUpperCase());
  }

  forCustomer(customerId: ID): Observable<Reservation[]> {
    return this.api.all<Reservation>(API.reservations, { customerId, _sort: '-date' });
  }

  tables(): Observable<RestaurantTable[]> {
    return this.api.all<RestaurantTable>(API.tables, { _sort: 'code' });
  }

  /**
   * Slot availability for a date, zone and party size.
   *
   * Computed client-side from the tables and existing bookings, which is
   * correct for a demo but races under real concurrency. Laravel must own this
   * as `GET /reservations/availability` with a row lock on the table. The
   * returned shape is deliberately identical so the UI does not change.
   */
  availability(date: IsoDate, zone: TableZone, guests: number): Observable<AvailabilitySlot[]> {
    return forkJoin({
      tables: this.tables(),
      booked: this.api.all<Reservation>(API.reservations, { date }),
    }).pipe(
      map(({ tables, booked }) => {
        const usable = tables.filter(
          (t) => t.zone === zone && t.isActive && !t.isComingSoon && t.seats >= guests,
        );
        const held = booked.filter((r) => r.zone === zone && HOLDS_TABLE.includes(r.status));

        return SLOT_TIMES.map((time) => {
          // A 90-minute sitting blocks the two slots on either side of it.
          const overlapping = held.filter((r) => Math.abs(minutes(r.time) - minutes(time)) < 90);
          const remaining = Math.max(0, usable.length - overlapping.length);
          return {
            time,
            label: formatSlot(time),
            available: remaining > 0,
            remainingTables: remaining,
          };
        });
      }),
    );
  }

  create(payload: ReservationPayload): Observable<Reservation> {
    const now = new Date().toISOString();
    const reservation: Omit<Reservation, 'id'> = {
      reference: generateReference(),
      ...payload,
      tableId: null,
      status: 'pending',
      durationMinutes: 90,
      source: 'web',
      createdAt: now,
      updatedAt: now,
    };
    return this.api.post<Reservation>(API.reservations, reservation);
  }

  confirm(id: ID, tableId: ID | null, tableCode?: string): Observable<Reservation> {
    return this.api.patch<Reservation>(API.reservations, id, {
      status: 'confirmed',
      tableId,
      tableCode,
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  reject(id: ID, reason: string): Observable<Reservation> {
    return this.api.patch<Reservation>(API.reservations, id, {
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    });
  }

  setStatus(id: ID, status: ReservationStatus): Observable<Reservation> {
    return this.api.patch<Reservation>(API.reservations, id, {
      status,
      ...(status === 'seated' ? { seatedAt: new Date().toISOString() } : {}),
      updatedAt: new Date().toISOString(),
    });
  }

  cancel(id: ID): Observable<Reservation> {
    return this.setStatus(id, 'cancelled');
  }

  remove(id: ID): Observable<unknown> {
    return this.api.delete(API.reservations, id);
  }
}

export function minutes(time: ClockTime): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function formatSlot(time: ClockTime): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function generateReference(): string {
  return `RSV-${Math.floor(1000 + Math.random() * 9000)}${Math.floor(10 + Math.random() * 89)}`;
}

export { SLOT_TIMES };
