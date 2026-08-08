import { ID, Money, Timestamped } from './common.model';

export type SpiceLevel = 0 | 1 | 2 | 3;

export type DietaryTag =
  | 'halal'
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'contains-nuts'
  | 'dairy'
  | 'spicy'
  | 'chef-special'
  | 'signature'
  | 'sharing-platter';

export interface MenuCategory extends Timestamped {
  id: ID;
  slug: string;
  name: string;
  nameUrdu?: string;
  description: string;
  image: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

/**
 * A size / weight variant. Salateen prices most curries by half- and full-kg,
 * exactly as printed on the in-house menu card.
 */
export interface MenuVariant {
  id: ID;
  label: string;
  labelUrdu?: string;
  price: Money;
  /** Approximate number of diners this variant comfortably serves. */
  serves: number;
  isDefault: boolean;
}

export interface MenuAddon {
  id: ID;
  name: string;
  price: Money;
  group: string;
  maxQuantity: number;
}

export interface NutritionFacts {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MenuItem extends Timestamped {
  id: ID;
  slug: string;
  categoryId: ID;
  name: string;
  nameUrdu?: string;
  shortDescription: string;
  description: string;
  /** Base path used by the responsive-image component, without size suffix. */
  image: string;
  gallery: string[];
  basePrice: Money;
  compareAtPrice?: Money;
  variants: MenuVariant[];
  addons: MenuAddon[];
  tags: DietaryTag[];
  spiceLevel: SpiceLevel;
  prepTimeMinutes: number;
  nutrition?: NutritionFacts;
  ingredients: string[];
  allergens: string[];
  rating: number;
  ratingCount: number;
  orderCount: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  isNew: boolean;
  isChefRecommended: boolean;
  sortOrder: number;
  seoTitle?: string;
  seoDescription?: string;
}

export type MenuSort = 'popular' | 'rating' | 'price-asc' | 'price-desc' | 'name-asc' | 'newest';

export interface MenuFilters {
  search: string;
  categorySlug: string | null;
  tags: DietaryTag[];
  maxSpice: SpiceLevel | null;
  priceMax: number | null;
  availableOnly: boolean;
  sort: MenuSort;
}

export const DEFAULT_MENU_FILTERS: MenuFilters = {
  search: '',
  categorySlug: null,
  tags: [],
  maxSpice: null,
  priceMax: null,
  availableOnly: false,
  sort: 'popular',
};
