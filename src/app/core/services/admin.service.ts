import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { API } from '../constants/api.constants';
import { ID, Paginated, QueryParams } from '../models/common.model';
import { AnalyticsSnapshot, DashboardStats } from '../models/analytics.model';
import {
  InventoryItem,
  InventoryLog,
  InventoryMovement,
  StockAlert,
  Supplier,
} from '../models/inventory.model';
import { Role, StaffMember, User } from '../models/user.model';
import { MenuCategory, MenuItem } from '../models/menu.model';
import { Coupon, DeliveryArea } from '../models/order.model';
import { RestaurantTable } from '../models/reservation.model';
import {
  BlogPost,
  Faq,
  GalleryImage,
  Offer,
  Review,
  Testimonial,
} from '../models/content.model';
import { ApiService } from './api.service';

/**
 * Back-office CRUD.
 *
 * Deliberately thin: every method is a typed pass-through to `ApiService`, so
 * swapping the base URL to Laravel needs no changes here. The only logic that
 * lives in this file is stock arithmetic, which JSON Server cannot do.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  // ------------------------------------------------------- dashboard ------

  dashboardStats(): Observable<DashboardStats> {
    return this.api.get<DashboardStats>(API.dashboardStats);
  }

  analytics(): Observable<AnalyticsSnapshot> {
    return this.api.get<AnalyticsSnapshot>(API.analytics);
  }

  // ------------------------------------------------------- inventory ------

  inventory(params?: QueryParams): Observable<InventoryItem[]> {
    return this.api.all<InventoryItem>(API.inventory, { _sort: 'name', ...params });
  }

  inventoryPage(params?: QueryParams): Observable<Paginated<InventoryItem>> {
    return this.api.list<InventoryItem>(API.inventory, { _sort: 'name', ...params });
  }

  inventoryItem(id: ID): Observable<InventoryItem> {
    return this.api.byId<InventoryItem>(API.inventory, id);
  }

  createInventoryItem(item: Omit<InventoryItem, 'id'>): Observable<InventoryItem> {
    return this.api.post<InventoryItem>(API.inventory, item);
  }

  updateInventoryItem(id: ID, patch: Partial<InventoryItem>): Observable<InventoryItem> {
    return this.api.patch<InventoryItem>(API.inventory, id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  deleteInventoryItem(id: ID): Observable<unknown> {
    return this.api.delete(API.inventory, id);
  }

  /**
   * Records a stock movement and applies it to the item balance.
   *
   * Two writes, not one transaction. Under concurrent kitchen usage this can
   * lose an update. Laravel must wrap it in a DB transaction with a row lock,
   * which is exactly what BACKEND_PLAN.md specifies for `InventoryService`.
   */
  recordMovement(
    item: InventoryItem,
    movement: InventoryMovement,
    quantityChange: number,
    performedByName: string,
    note?: string,
  ): Observable<{ item: InventoryItem; log: InventoryLog }> {
    const quantityAfter = Math.max(0, Math.round((item.quantity + quantityChange) * 100) / 100);
    const now = new Date().toISOString();
    const log: Omit<InventoryLog, 'id'> = {
      inventoryItemId: item.id,
      itemName: item.name,
      movement,
      quantityChange,
      quantityAfter,
      unitCost: movement === 'purchase' ? item.unitCost : undefined,
      totalCost: movement === 'purchase' ? Math.round(item.unitCost * Math.abs(quantityChange)) : undefined,
      supplierId: movement === 'purchase' ? item.supplierId : undefined,
      performedByName,
      note,
      createdAt: now,
    };
    return forkJoin({
      item: this.updateInventoryItem(item.id, {
        quantity: quantityAfter,
        ...(movement === 'purchase' ? { lastRestockedAt: now } : {}),
      }),
      log: this.api.post<InventoryLog>(API.inventoryLogs, log),
    });
  }

  inventoryLogs(params?: QueryParams): Observable<InventoryLog[]> {
    return this.api.all<InventoryLog>(API.inventoryLogs, { _sort: '-createdAt', ...params });
  }

  stockAlerts(): Observable<StockAlert[]> {
    return this.inventory().pipe(map((items) => items.map(toStockAlert).filter((a) => a.severity !== 'healthy')));
  }

  // -------------------------------------------------------- suppliers -----

  suppliers(params?: QueryParams): Observable<Supplier[]> {
    return this.api.all<Supplier>(API.suppliers, { _sort: 'name', ...params });
  }
  createSupplier(s: Omit<Supplier, 'id'>) {
    return this.api.post<Supplier>(API.suppliers, s);
  }
  updateSupplier(id: ID, patch: Partial<Supplier>) {
    return this.api.patch<Supplier>(API.suppliers, id, patch);
  }
  deleteSupplier(id: ID) {
    return this.api.delete(API.suppliers, id);
  }

  // ------------------------------------------------------------ menu ------

  menuItems(params?: QueryParams): Observable<MenuItem[]> {
    return this.api.all<MenuItem>(API.menu, { _sort: 'sortOrder', ...params });
  }
  createMenuItem(item: Omit<MenuItem, 'id'>) {
    return this.api.post<MenuItem>(API.menu, item);
  }
  updateMenuItem(id: ID, patch: Partial<MenuItem>) {
    return this.api.patch<MenuItem>(API.menu, id, { ...patch, updatedAt: new Date().toISOString() });
  }
  deleteMenuItem(id: ID) {
    return this.api.delete(API.menu, id);
  }

  categories(params?: QueryParams): Observable<MenuCategory[]> {
    return this.api.all<MenuCategory>(API.categories, { _sort: 'sortOrder', ...params });
  }
  createCategory(c: Omit<MenuCategory, 'id'>) {
    return this.api.post<MenuCategory>(API.categories, c);
  }
  updateCategory(id: ID, patch: Partial<MenuCategory>) {
    return this.api.patch<MenuCategory>(API.categories, id, patch);
  }
  deleteCategory(id: ID) {
    return this.api.delete(API.categories, id);
  }

  // --------------------------------------------------- offers & coupons ---

  offers(params?: QueryParams): Observable<Offer[]> {
    return this.api.all<Offer>(API.offers, params);
  }
  createOffer(o: Omit<Offer, 'id'>) {
    return this.api.post<Offer>(API.offers, o);
  }
  updateOffer(id: ID, patch: Partial<Offer>) {
    return this.api.patch<Offer>(API.offers, id, patch);
  }
  deleteOffer(id: ID) {
    return this.api.delete(API.offers, id);
  }

  coupons(params?: QueryParams): Observable<Coupon[]> {
    return this.api.all<Coupon>(API.coupons, params);
  }
  createCoupon(c: Omit<Coupon, 'id'>) {
    return this.api.post<Coupon>(API.coupons, c);
  }
  updateCoupon(id: ID, patch: Partial<Coupon>) {
    return this.api.patch<Coupon>(API.coupons, id, patch);
  }
  deleteCoupon(id: ID) {
    return this.api.delete(API.coupons, id);
  }

  // ----------------------------------------------------------- people -----

  users(params?: QueryParams): Observable<User[]> {
    return this.api.all<User>(API.users, { _sort: 'name', ...params });
  }
  customers(params?: QueryParams): Observable<User[]> {
    return this.api.all<User>(API.users, { roleSlug: 'customer', _sort: 'name', ...params });
  }
  user(id: ID) {
    return this.api.byId<User>(API.users, id);
  }
  createUser(u: Omit<User, 'id'>) {
    return this.api.post<User>(API.users, u);
  }
  updateUser(id: ID, patch: Partial<User>) {
    return this.api.patch<User>(API.users, id, { ...patch, updatedAt: new Date().toISOString() });
  }
  deleteUser(id: ID) {
    return this.api.delete(API.users, id);
  }

  roles(): Observable<Role[]> {
    return this.api.all<Role>(API.roles);
  }
  updateRole(id: ID, patch: Partial<Role>) {
    return this.api.patch<Role>(API.roles, id, patch);
  }
  createRole(r: Omit<Role, 'id'>) {
    return this.api.post<Role>(API.roles, r);
  }
  deleteRole(id: ID) {
    return this.api.delete(API.roles, id);
  }

  permissions(): Observable<{ id: ID; key: string; module: string; action: string; label: string }[]> {
    return this.api.all(API.permissions);
  }

  staff(params?: QueryParams): Observable<StaffMember[]> {
    return this.api.all<StaffMember>(API.staff, { _sort: 'name', ...params });
  }
  createStaff(s: Omit<StaffMember, 'id'>) {
    return this.api.post<StaffMember>(API.staff, s);
  }
  updateStaff(id: ID, patch: Partial<StaffMember>) {
    return this.api.patch<StaffMember>(API.staff, id, patch);
  }
  deleteStaff(id: ID) {
    return this.api.delete(API.staff, id);
  }

  // ----------------------------------------------------------- tables -----

  tables(): Observable<RestaurantTable[]> {
    return this.api.all<RestaurantTable>(API.tables, { _sort: 'code' });
  }
  createTable(t: Omit<RestaurantTable, 'id'>) {
    return this.api.post<RestaurantTable>(API.tables, t);
  }
  updateTable(id: ID, patch: Partial<RestaurantTable>) {
    return this.api.patch<RestaurantTable>(API.tables, id, patch);
  }
  deleteTable(id: ID) {
    return this.api.delete(API.tables, id);
  }

  deliveryAreas(): Observable<DeliveryArea[]> {
    return this.api.all<DeliveryArea>(API.deliveryAreas, { _sort: 'name' });
  }
  createDeliveryArea(a: Omit<DeliveryArea, 'id'>) {
    return this.api.post<DeliveryArea>(API.deliveryAreas, a);
  }
  updateDeliveryArea(id: ID, patch: Partial<DeliveryArea>) {
    return this.api.patch<DeliveryArea>(API.deliveryAreas, id, patch);
  }
  deleteDeliveryArea(id: ID) {
    return this.api.delete(API.deliveryAreas, id);
  }

  // ---------------------------------------------------------- content ------

  reviews(params?: QueryParams): Observable<Review[]> {
    return this.api.all<Review>(API.reviews, { _sort: '-createdAt', ...params });
  }
  updateReview(id: ID, patch: Partial<Review>) {
    return this.api.patch<Review>(API.reviews, id, patch);
  }
  deleteReview(id: ID) {
    return this.api.delete(API.reviews, id);
  }

  testimonials(params?: QueryParams): Observable<Testimonial[]> {
    return this.api.all<Testimonial>(API.testimonials, params);
  }
  updateTestimonial(id: ID, patch: Partial<Testimonial>) {
    return this.api.patch<Testimonial>(API.testimonials, id, patch);
  }
  createTestimonial(t: Omit<Testimonial, 'id'>) {
    return this.api.post<Testimonial>(API.testimonials, t);
  }
  deleteTestimonial(id: ID) {
    return this.api.delete(API.testimonials, id);
  }

  galleryImages(): Observable<GalleryImage[]> {
    return this.api.all<GalleryImage>(API.gallery, { _sort: 'sortOrder' });
  }
  createGalleryImage(g: Omit<GalleryImage, 'id'>) {
    return this.api.post<GalleryImage>(API.gallery, g);
  }
  updateGalleryImage(id: ID, patch: Partial<GalleryImage>) {
    return this.api.patch<GalleryImage>(API.gallery, id, patch);
  }
  deleteGalleryImage(id: ID) {
    return this.api.delete(API.gallery, id);
  }

  blogPosts(params?: QueryParams): Observable<BlogPost[]> {
    return this.api.all<BlogPost>(API.blogs, { _sort: '-publishedAt', ...params });
  }
  createBlogPost(b: Omit<BlogPost, 'id'>) {
    return this.api.post<BlogPost>(API.blogs, b);
  }
  updateBlogPost(id: ID, patch: Partial<BlogPost>) {
    return this.api.patch<BlogPost>(API.blogs, id, patch);
  }
  deleteBlogPost(id: ID) {
    return this.api.delete(API.blogs, id);
  }

  faqs(): Observable<Faq[]> {
    return this.api.all<Faq>(API.faq, { _sort: 'sortOrder' });
  }
  createFaq(f: Omit<Faq, 'id'>) {
    return this.api.post<Faq>(API.faq, f);
  }
  updateFaq(id: ID, patch: Partial<Faq>) {
    return this.api.patch<Faq>(API.faq, id, patch);
  }
  deleteFaq(id: ID) {
    return this.api.delete(API.faq, id);
  }
}

export function toStockAlert(item: InventoryItem): StockAlert {
  const ratio = item.reorderLevel > 0 ? item.quantity / item.reorderLevel : 99;
  if (item.expiryDate) {
    const daysLeft = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 864e5);
    if (daysLeft <= 3) {
      return {
        item,
        severity: 'expiring',
        message:
          daysLeft < 0
            ? `Expired ${Math.abs(daysLeft)} day(s) ago`
            : `Expires in ${daysLeft} day(s)`,
      };
    }
  }
  if (ratio <= 0.5) {
    return { item, severity: 'critical', message: `Critically low: ${item.quantity} ${item.unit} left` };
  }
  if (ratio <= 1) {
    return { item, severity: 'low', message: `Below reorder level of ${item.reorderLevel} ${item.unit}` };
  }
  return { item, severity: 'healthy', message: 'In stock' };
}
