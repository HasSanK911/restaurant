import { ClockTime, GeoPoint, ID } from './common.model';

export interface OpeningHour {
  /** 0 = Sunday ... 6 = Saturday, matching `Date.prototype.getDay()`. */
  day: number;
  dayName: string;
  opensAt: ClockTime;
  closesAt: ClockTime;
  /** True when `closesAt` falls after midnight. Salateen closes at 00:00. */
  closesNextDay: boolean;
  isClosed: boolean;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  whatsapp?: string;
  googleMaps?: string;
}

export interface AmenityGroup {
  group: string;
  items: string[];
}

export interface RestaurantProfile {
  id: ID;
  name: string;
  legalName: string;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  cuisines: string[];
  categories: string[];
  phone: string;
  phoneDisplay: string;
  whatsapp?: string;
  email: string;
  street: string;
  area: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  countryCode: string;
  geo: GeoPoint;
  mapEmbedUrl: string;
  priceRange: string;
  currency: string;
  currencySymbol: string;
  foundedYear: number;
  seatingCapacity: number;
  rating: number;
  ratingCount: number;
  openingHours: OpeningHour[];
  social: SocialLinks;
  amenities: AmenityGroup[];
  logoUrl: string;
  heroImage: string;
}

export interface WorkingHoursStatus {
  isOpen: boolean;
  /** Human label, e.g. "Open now, closes 12:00 AM" or "Opens 10:00 AM". */
  label: string;
  today?: OpeningHour;
  nextChangeAt?: string;
}

export interface AppSettings {
  id: ID;
  taxPercent: number;
  taxLabel: string;
  serviceChargePercent: number;
  defaultDeliveryFee: number;
  freeDeliveryThreshold: number;
  minimumOrderValue: number;
  averagePrepMinutes: number;
  maxGuestsPerReservation: number;
  reservationSlotMinutes: number;
  reservationLeadHours: number;
  reservationMaxDaysAhead: number;
  onlinePaymentEnabled: boolean;
  orderingEnabled: boolean;
  reservationsEnabled: boolean;
  maintenanceMode: boolean;
  announcement: string | null;
}
