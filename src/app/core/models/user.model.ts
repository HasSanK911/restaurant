import { Address, ID, IsoDateTime, Timestamped } from './common.model';

export type RoleSlug = 'customer' | 'admin' | 'manager' | 'staff' | 'kitchen' | 'rider';

/** `module.action`, e.g. `orders.update`. The wildcard `*` grants everything. */
export type Permission = string;

export interface Role extends Timestamped {
  id: ID;
  slug: RoleSlug;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
}

export interface UserPreferences {
  marketingEmails: boolean;
  orderUpdates: boolean;
  smsAlerts: boolean;
  language: 'en' | 'ur';
}

export interface User extends Timestamped {
  id: ID;
  name: string;
  email: string;
  phone: string;
  /**
   * Demo-only field. JSON Server has no auth layer, so credentials live in
   * db.json. A real backend never returns this. See MIGRATION_GUIDE.md.
   */
  password?: string;
  roleSlug: RoleSlug;
  avatar?: string;
  isActive: boolean;
  emailVerifiedAt?: IsoDateTime;
  lastLoginAt?: IsoDateTime;
  addresses: Address[];
  favouriteItemIds: ID[];
  loyaltyPoints: number;
  preferences: UserPreferences;
}

export interface StaffMember extends Timestamped {
  id: ID;
  userId: ID | null;
  name: string;
  designation: string;
  department: 'kitchen' | 'service' | 'delivery' | 'management' | 'housekeeping';
  phone: string;
  photo?: string;
  shift: 'morning' | 'evening' | 'split' | 'night';
  joinedAt: IsoDateTime;
  salary?: number;
  isActive: boolean;
}

/** The user shape held in memory. Never includes credentials. */
export interface AuthUser {
  id: ID;
  name: string;
  email: string;
  phone: string;
  roleSlug: RoleSlug;
  avatar?: string;
  permissions: Permission[];
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: IsoDateTime;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}
