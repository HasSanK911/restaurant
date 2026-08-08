import { ClockTime, ID, IsoDate, IsoDateTime, Timestamped } from './common.model';

export type TableZone = 'indoor' | 'outdoor' | 'family-hall' | 'rooftop';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'no-show';

export interface RestaurantTable extends Timestamped {
  id: ID;
  code: string;
  zone: TableZone;
  seats: number;
  minGuests: number;
  isActive: boolean;
  /** Rooftop is flagged coming-soon in this demo, matching the brief. */
  isComingSoon: boolean;
  notes?: string;
}

export interface Reservation extends Timestamped {
  id: ID;
  reference: string;
  customerId: ID | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  date: IsoDate;
  time: ClockTime;
  guests: number;
  zone: TableZone;
  tableId: ID | null;
  tableCode?: string;
  occasion?: string;
  note?: string;
  status: ReservationStatus;
  confirmedAt?: IsoDateTime;
  rejectionReason?: string;
  seatedAt?: IsoDateTime;
  durationMinutes: number;
  source: 'web' | 'phone' | 'walk-in';
}

export interface ReservationPayload {
  customerId: ID | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  date: IsoDate;
  time: ClockTime;
  guests: number;
  zone: TableZone;
  occasion?: string;
  note?: string;
}

export interface AvailabilitySlot {
  time: ClockTime;
  label: string;
  available: boolean;
  remainingTables: number;
}
