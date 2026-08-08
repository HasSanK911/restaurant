import { ID, IsoDate, Money } from './common.model';

export interface DashboardStats {
  id: ID;
  todayOrders: number;
  todayRevenue: Money;
  todayReservations: number;
  todayCovers: number;
  pendingOrders: number;
  activeKitchenTickets: number;
  averageOrderValue: Money;
  averagePrepMinutes: number;
  lowStockCount: number;
  newCustomers: number;
  ordersDelta: number;
  revenueDelta: number;
  reservationsDelta: number;
  customersDelta: number;
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface RevenueSeries {
  id: ID;
  range: 'week' | 'month' | 'year';
  points: TimeSeriesPoint[];
}

export interface TopSellingItem {
  menuItemId: ID;
  name: string;
  image: string;
  quantitySold: number;
  revenue: Money;
  categoryName: string;
}

export interface CategoryShare {
  categoryId: ID;
  name: string;
  orders: number;
  revenue: Money;
  sharePercent: number;
}

export interface CustomerGrowthPoint {
  month: string;
  newCustomers: number;
  returningCustomers: number;
}

export interface HourlyLoadPoint {
  hour: string;
  orders: number;
}

export interface AnalyticsSnapshot {
  id: ID;
  date: IsoDate;
  revenueWeek: TimeSeriesPoint[];
  revenueMonth: TimeSeriesPoint[];
  revenueYear: TimeSeriesPoint[];
  topSelling: TopSellingItem[];
  categoryShare: CategoryShare[];
  customerGrowth: CustomerGrowthPoint[];
  hourlyLoad: HourlyLoadPoint[];
  fulfilmentSplit: { label: string; value: number }[];
}
