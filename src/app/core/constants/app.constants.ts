import { SelectOption } from '../models/common.model';
import { OrderStatus, PaymentMethod, FulfilmentType } from '../models/order.model';
import { ReservationStatus, TableZone } from '../models/reservation.model';
import { DietaryTag, MenuSort, SpiceLevel } from '../models/menu.model';

/** Facts about the business, sourced from the restaurant's public listing. */
export const BRAND = {
  name: 'Salateen Restaurant',
  fullName: 'Salateen Restaurant Swabi',
  tagline: 'Charcoal, Copper & Kabuli Rice',
  phone: '+923120991116',
  phoneDisplay: '0312-0991116',
  whatsapp: '+923120991116',
  email: 'hello@salateenrestaurant.pk',
  street: 'Jhangira Road, Mal Lar',
  city: 'Swabi',
  region: 'Khyber Pakhtunkhwa',
  postalCode: '23430',
  country: 'Pakistan',
  countryCode: 'PK',
  latitude: 34.1201,
  longitude: 72.4703,
  currency: 'PKR',
  currencySymbol: 'Rs',
  foundedYear: 2011,
} as const;

/** Order lifecycle, in the exact sequence the kitchen and riders work through. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'out-for-delivery',
  'delivered',
];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; description: string; tone: string; icon: string }
> = {
  pending: {
    label: 'Pending',
    description: 'We have received your order and are confirming it.',
    tone: 'amber',
    icon: 'clock',
  },
  accepted: {
    label: 'Accepted',
    description: 'Order confirmed. It is queued for the kitchen.',
    tone: 'basil',
    icon: 'check',
  },
  preparing: {
    label: 'Preparing',
    description: 'Our chefs are cooking your order over charcoal.',
    tone: 'turmeric',
    icon: 'flame',
  },
  ready: {
    label: 'Ready',
    description: 'Freshly plated and ready to leave the pass.',
    tone: 'clay',
    icon: 'bell',
  },
  'out-for-delivery': {
    label: 'Out for Delivery',
    description: 'On the way to your address.',
    tone: 'basil',
    icon: 'bike',
  },
  delivered: {
    label: 'Delivered',
    description: 'Enjoy your meal. Thank you for choosing Salateen.',
    tone: 'emerald',
    icon: 'check-circle',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'This order was cancelled.',
    tone: 'red',
    icon: 'x-circle',
  },
};

export const RESERVATION_STATUS_META: Record<
  ReservationStatus,
  { label: string; tone: string }
> = {
  pending: { label: 'Awaiting Confirmation', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'emerald' },
  seated: { label: 'Seated', tone: 'basil' },
  completed: { label: 'Completed', tone: 'ink' },
  rejected: { label: 'Not Available', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  'no-show': { label: 'No Show', tone: 'red' },
};

export const TABLE_ZONES: {
  value: TableZone;
  label: string;
  description: string;
  image: string;
  comingSoon: boolean;
}[] = [
  {
    value: 'indoor',
    label: 'Indoor Hall',
    description: 'Air-conditioned blue-tiled hall with the mural wall.',
    image: 'assets/images/interior/main-dining-hall',
    comingSoon: false,
  },
  {
    value: 'family-hall',
    label: 'Family Hall',
    description: 'Private partitioned seating with full purdah for families.',
    image: 'assets/images/interior/family-hall-lit',
    comingSoon: false,
  },
  {
    value: 'outdoor',
    label: 'Outdoor Lawn',
    description: 'Open-air tables on the lawn beside the charcoal pits.',
    image: 'assets/images/ambience/family-garden',
    comingSoon: false,
  },
  {
    value: 'rooftop',
    label: 'Rooftop Terrace',
    description: 'Opening soon. Sunset views over Jhangira Road.',
    image: 'assets/images/exterior/night-terrace',
    comingSoon: true,
  },
];

export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  description: string;
  fulfilment: FulfilmentType;
}[] = [
  {
    value: 'cash-on-delivery',
    label: 'Cash on Delivery',
    description: 'Pay the rider in cash when your order arrives.',
    fulfilment: 'delivery',
  },
  {
    value: 'cash-at-counter',
    label: 'Cash at Counter',
    description: 'Pay at the counter when you dine in.',
    fulfilment: 'dine-in',
  },
];

export const SPICE_LEVELS: { value: SpiceLevel; label: string }[] = [
  { value: 0, label: 'Mild' },
  { value: 1, label: 'Medium' },
  { value: 2, label: 'Hot' },
  { value: 3, label: 'Fiery' },
];

export const DIETARY_TAG_META: Record<DietaryTag, { label: string; tone: string }> = {
  halal: { label: 'Halal', tone: 'emerald' },
  vegetarian: { label: 'Vegetarian', tone: 'emerald' },
  vegan: { label: 'Vegan', tone: 'emerald' },
  'gluten-free': { label: 'Gluten Free', tone: 'basil' },
  'contains-nuts': { label: 'Contains Nuts', tone: 'amber' },
  dairy: { label: 'Dairy', tone: 'basil' },
  spicy: { label: 'Spicy', tone: 'turmeric' },
  'chef-special': { label: "Chef's Special", tone: 'clay' },
  signature: { label: 'Signature', tone: 'clay' },
  'sharing-platter': { label: 'Sharing Platter', tone: 'clay' },
};

export const MENU_SORT_OPTIONS: SelectOption<MenuSort>[] = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'newest', label: 'Newest First' },
];

export const OCCASIONS: SelectOption[] = [
  { value: '', label: 'No special occasion' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'family-gathering', label: 'Family Gathering' },
  { value: 'business-lunch', label: 'Business Lunch' },
  { value: 'walima', label: 'Walima / Mehndi Party' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'other', label: 'Other' },
];

export const CONTACT_TOPICS: SelectOption[] = [
  { value: 'general', label: 'General Enquiry' },
  { value: 'catering', label: 'Catering & Large Orders' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'careers', label: 'Careers' },
  { value: 'partnership', label: 'Partnership' },
];

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
