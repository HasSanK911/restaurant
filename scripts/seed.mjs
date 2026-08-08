/**
 * Builds db.json for the JSON Server demo backend.
 *
 *   npm run seed
 *
 * Deterministic: a fixed-seed PRNG means every run produces byte-identical
 * output, so db.json diffs stay readable and demos stay reproducible.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESTAURANT, SETTINGS, CATEGORIES, MENU, ADDONS, IMG } from './seed-catalogue.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ utils */

/** mulberry32: tiny, fast, deterministic. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260807);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickMany = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
};
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p) => rand() < p;
const round = (n, to = 10) => Math.round(n / to) * to;

/** Fixed "now" so generated timelines never drift between runs. */
const NOW = new Date('2026-08-07T14:30:00.000Z');
const iso = (d) => new Date(d).toISOString();
const daysAgo = (n, h = 0) => iso(NOW.getTime() - n * 864e5 + h * 36e5);
const minutesAgo = (n) => iso(NOW.getTime() - n * 6e4);
const daysAhead = (n) => iso(NOW.getTime() + n * 864e5);
const dateOnly = (offsetDays) =>
  new Date(NOW.getTime() + offsetDays * 864e5).toISOString().slice(0, 10);

/* ------------------------------------------------------- people & names */

const MALE_NAMES = [
  'Asad Khan', 'Bilal Ahmad', 'Fawad Ali', 'Hamza Yousafzai', 'Imran Shah', 'Junaid Iqbal',
  'Kamran Khattak', 'Luqman Afridi', 'Mudassir Khan', 'Naveed Anwar', 'Owais Durrani',
  'Qasim Jan', 'Rehman Gul', 'Sohail Amin', 'Tariq Mehmood', 'Usman Wazir', 'Waqar Zeb',
  'Yasir Hussain', 'Zubair Marwat', 'Adnan Bacha', 'Shahid Nawaz', 'Faisal Rehman',
  'Nauman Sadiq', 'Haris Ayub', 'Salman Tariq', 'Arsalan Khan', 'Danish Ali', 'Ibrahim Shinwari',
];
const FEMALE_NAMES = [
  'Ayesha Bibi', 'Hina Gul', 'Maria Khan', 'Nadia Yousaf', 'Rabia Noor', 'Sana Ullah',
  'Zainab Shah', 'Farah Naz', 'Kiran Aziz', 'Sadia Hameed', 'Amna Riaz', 'Hafsa Malik',
];
const ALL_NAMES = [...MALE_NAMES, ...FEMALE_NAMES];

const AREAS = [
  'Mal Lar', 'Swabi City', 'Jhangira Road', 'Yar Hussain', 'Topi', 'Kalu Khan', 'Panjpir',
  'Marghuz', 'Shewa Adda', 'Adina', 'Zaida', 'Chota Lahore', 'Gadoon Amazai', 'Manki',
];

const phoneFor = (i) => `03${int(0, 4)}${String(1000000 + ((i * 78901) % 8999999)).slice(0, 7)}`;
const emailFor = (name, i) =>
  `${name.toLowerCase().replace(/[^a-z]+/g, '.')}${i}@example.com`.replace(/\.\./g, '.');

/* ------------------------------------------------------------ 1. Catalogue */

const categories = CATEGORIES.map((c, i) => ({
  id: String(i + 1),
  slug: c.slug,
  name: c.name,
  nameUrdu: c.nameUrdu,
  description: c.description,
  image: c.image,
  icon: c.icon,
  sortOrder: i + 1,
  isActive: true,
  isFeatured: c.isFeatured,
  seoTitle: `${c.name} in Swabi | Salateen Restaurant`,
  seoDescription: c.description,
  createdAt: daysAgo(900),
  updatedAt: daysAgo(int(1, 90)),
}));
const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

const menu = MENU.map((m, i) => {
  const variants = m.variants.map((v, vi) => ({
    id: `${i + 1}-v${vi + 1}`,
    label: v.label,
    price: v.price,
    serves: v.serves,
    isDefault: v.isDefault,
  }));
  const base = variants.find((v) => v.isDefault)?.price ?? variants[0].price;
  return {
    id: String(i + 1),
    slug: m.slug,
    categoryId: catBySlug[m.category].id,
    name: m.name,
    nameUrdu: m.nameUrdu,
    shortDescription: m.short,
    description: m.description,
    image: m.image,
    gallery: m.gallery,
    basePrice: base,
    compareAtPrice: m.flags.featured && chance(0.35) ? round(base * 1.2) : undefined,
    variants,
    addons: pickMany(ADDONS, int(2, 4)).sort((a, b) => a.id.localeCompare(b.id)),
    tags: m.tags,
    spiceLevel: m.spice,
    prepTimeMinutes: m.prep,
    nutrition: m.nutrition,
    ingredients: m.ingredients,
    allergens: m.allergens,
    rating: m.rating,
    ratingCount: m.ratingCount,
    orderCount: m.orders,
    isAvailable: !chance(0.04),
    isFeatured: m.flags.featured,
    isPopular: m.flags.popular,
    isNew: m.flags.new,
    isChefRecommended: m.flags.chef,
    sortOrder: i + 1,
    priceSource: m.priceNote,
    seoTitle: `${m.name} | Salateen Restaurant Swabi`,
    seoDescription: m.short,
    createdAt: daysAgo(int(200, 1400)),
    updatedAt: daysAgo(int(1, 60)),
  };
});
const menuById = Object.fromEntries(menu.map((m) => [m.id, m]));

/* ----------------------------------------------------- 2. Roles & users */

const PERMISSION_MODULES = [
  'dashboard', 'orders', 'kitchen', 'reservations', 'menu', 'categories', 'offers', 'coupons',
  'inventory', 'customers', 'staff', 'users', 'roles', 'reviews', 'content', 'reports',
  'settings', 'logs',
];
const ACTIONS = ['view', 'create', 'update', 'delete'];
const permissions = PERMISSION_MODULES.flatMap((mod, mi) =>
  ACTIONS.map((a, ai) => ({
    id: `${mi * 4 + ai + 1}`,
    key: `${mod}.${a}`,
    module: mod,
    action: a,
    label: `${a[0].toUpperCase()}${a.slice(1)} ${mod}`,
  })),
);

const roles = [
  {
    id: '1', slug: 'admin', name: 'Administrator',
    description: 'Unrestricted access to every module and setting.',
    permissions: ['*'], isSystem: true,
  },
  {
    id: '2', slug: 'manager', name: 'Restaurant Manager',
    description: 'Runs daily operations. No user, role or system-log access.',
    permissions: permissions
      .filter((p) => !['users', 'roles', 'logs'].includes(p.module))
      .map((p) => p.key),
    isSystem: true,
  },
  {
    id: '3', slug: 'staff', name: 'Floor Staff',
    description: 'Takes orders and seats reservations.',
    permissions: [
      'dashboard.view', 'orders.view', 'orders.create', 'orders.update',
      'reservations.view', 'reservations.create', 'reservations.update',
      'menu.view', 'customers.view',
    ],
    isSystem: true,
  },
  {
    id: '4', slug: 'kitchen', name: 'Kitchen',
    description: 'Sees the live queue and updates ticket status only.',
    permissions: ['kitchen.view', 'kitchen.update', 'orders.view', 'orders.update', 'menu.view', 'inventory.view'],
    isSystem: true,
  },
  {
    id: '5', slug: 'rider', name: 'Delivery Rider',
    description: 'Reserved for the future rider app.',
    permissions: ['orders.view', 'orders.update'], isSystem: true,
  },
  {
    id: '6', slug: 'customer', name: 'Customer',
    description: 'Public storefront account.',
    permissions: [], isSystem: true,
  },
].map((r) => ({ ...r, createdAt: daysAgo(900), updatedAt: daysAgo(30) }));

const STAFF_ACCOUNTS = [
  { name: 'Sardar Salateen Khan', email: 'admin@salateenrestaurant.pk', role: 'admin', designation: 'Owner & Proprietor' },
  { name: 'Rashid Ali Khan', email: 'manager@salateenrestaurant.pk', role: 'manager', designation: 'Restaurant Manager' },
  { name: 'Gulzar Ahmad', email: 'kitchen@salateenrestaurant.pk', role: 'kitchen', designation: 'Head Chef' },
  { name: 'Noor Muhammad', email: 'staff@salateenrestaurant.pk', role: 'staff', designation: 'Floor Supervisor' },
  { name: 'Sajid Iqbal', email: 'rider@salateenrestaurant.pk', role: 'rider', designation: 'Delivery Rider' },
];

const users = [];
STAFF_ACCOUNTS.forEach((s, i) => {
  users.push({
    id: String(i + 1),
    name: s.name,
    email: s.email,
    phone: phoneFor(i + 1),
    password: 'salateen123',
    roleSlug: s.role,
    avatar: null,
    isActive: true,
    emailVerifiedAt: daysAgo(800),
    lastLoginAt: minutesAgo(int(5, 400)),
    addresses: [],
    favouriteItemIds: [],
    loyaltyPoints: 0,
    preferences: { marketingEmails: false, orderUpdates: true, smsAlerts: true, language: 'en' },
    createdAt: daysAgo(int(700, 1600)),
    updatedAt: daysAgo(int(1, 40)),
  });
});

const CUSTOMER_COUNT = 42;
for (let i = 0; i < CUSTOMER_COUNT; i++) {
  const name = ALL_NAMES[i % ALL_NAMES.length];
  const id = String(users.length + 1);
  const area = pick(AREAS);
  users.push({
    id,
    name,
    email: i === 0 ? 'customer@example.com' : emailFor(name, i),
    phone: phoneFor(i + 50),
    password: 'salateen123',
    roleSlug: 'customer',
    avatar: null,
    isActive: !chance(0.05),
    emailVerifiedAt: chance(0.8) ? daysAgo(int(30, 700)) : undefined,
    lastLoginAt: daysAgo(int(0, 60)),
    addresses: [
      {
        id: `${id}-a1`,
        label: 'Home',
        line1: `House ${int(1, 320)}, Street ${int(1, 24)}`,
        area,
        city: 'Swabi',
        landmark: pick(['Near Jamia Masjid', 'Opposite Government School', 'Behind the bus stop', 'Next to the petrol pump']),
        phone: phoneFor(i + 50),
        isDefault: true,
      },
    ],
    favouriteItemIds: pickMany(menu, int(0, 5)).map((m) => m.id),
    loyaltyPoints: int(0, 4200),
    preferences: {
      marketingEmails: chance(0.6),
      orderUpdates: true,
      smsAlerts: chance(0.7),
      language: chance(0.25) ? 'ur' : 'en',
    },
    createdAt: daysAgo(int(5, 900)),
    updatedAt: daysAgo(int(0, 30)),
  });
}
const customers = users.filter((u) => u.roleSlug === 'customer');

const STAFF_ROSTER = [
  ['Gulzar Ahmad', 'Head Chef', 'kitchen', 'split'],
  ['Fazal Rabi', 'Grill Master (Charcoal)', 'kitchen', 'evening'],
  ['Hidayat Ullah', 'Karahi Chef', 'kitchen', 'split'],
  ['Shakeel Ahmad', 'Tandoor Baker', 'kitchen', 'evening'],
  ['Amjad Khan', 'Pulao Chef', 'kitchen', 'morning'],
  ['Ihsan Ullah', 'Commis Chef', 'kitchen', 'morning'],
  ['Noor Muhammad', 'Floor Supervisor', 'service', 'split'],
  ['Wahid Gul', 'Senior Waiter', 'service', 'evening'],
  ['Sher Zaman', 'Waiter', 'service', 'evening'],
  ['Naeem Khan', 'Waiter', 'service', 'morning'],
  ['Riaz Ahmad', 'Family Hall Attendant', 'service', 'evening'],
  ['Sajid Iqbal', 'Delivery Rider', 'delivery', 'evening'],
  ['Khalid Mehmood', 'Delivery Rider', 'delivery', 'split'],
  ['Rashid Ali Khan', 'Restaurant Manager', 'management', 'split'],
  ['Zahir Shah', 'Cashier', 'management', 'evening'],
  ['Bakht Zada', 'Housekeeping', 'housekeeping', 'morning'],
];
const staff = STAFF_ROSTER.map(([name, designation, department, shift], i) => ({
  id: String(i + 1),
  userId: users.find((u) => u.name === name)?.id ?? null,
  name,
  designation,
  department,
  phone: phoneFor(i + 200),
  photo: null,
  shift,
  joinedAt: daysAgo(int(120, 2400)),
  salary: int(3, 12) * 10000,
  isActive: !chance(0.06),
  createdAt: daysAgo(int(120, 2400)),
}));

/* ------------------------------------------------------- 3. Tables & areas */

const tables = [];
let tableNo = 1;
const ZONE_PLAN = [
  ['indoor', 10, [4, 4, 4, 6, 6, 4, 4, 8, 6, 4]],
  ['family-hall', 8, [6, 6, 8, 8, 10, 6, 12, 8]],
  ['outdoor', 6, [4, 4, 6, 6, 8, 4]],
  ['rooftop', 4, [4, 6, 6, 8]],
];
for (const [zone, count, seatPlan] of ZONE_PLAN) {
  for (let i = 0; i < count; i++) {
    tables.push({
      id: String(tableNo),
      code: `${zone === 'family-hall' ? 'F' : zone === 'outdoor' ? 'L' : zone === 'rooftop' ? 'R' : 'T'}${String(i + 1).padStart(2, '0')}`,
      zone,
      seats: seatPlan[i],
      minGuests: Math.max(1, seatPlan[i] - 3),
      isActive: zone !== 'rooftop',
      isComingSoon: zone === 'rooftop',
      notes: zone === 'family-hall' ? 'Partitioned with full purdah screening.' : undefined,
      createdAt: daysAgo(900),
    });
    tableNo++;
  }
}

const deliveryAreas = [
  ['Swabi City', 100, 2000, 35, ['Main Bazaar', 'Bank Road', 'Chowk Bazaar']],
  ['Mal Lar', 60, 1500, 20, ['Jhangira Road', 'Mal Lar Chowk']],
  ['Jhangira Road Corridor', 80, 1800, 25, ['Petrol Pump', 'Truck Adda']],
  ['Yar Hussain', 150, 2500, 45, ['Yar Hussain Bazaar', 'Degree College']],
  ['Topi', 180, 3000, 50, ['GIK Institute', 'Topi Bazaar']],
  ['Kalu Khan', 160, 2800, 45, ['Kalu Khan Bazaar']],
  ['Panjpir', 170, 2800, 48, ['Panjpir Sharif']],
  ['Marghuz', 200, 3200, 55, ['Marghuz Chowk']],
  ['Zaida', 190, 3000, 52, ['Zaida Bazaar']],
  ['Shewa Adda', 140, 2400, 40, ['Shewa Chowk']],
].map(([name, fee, min, minutes, landmarks], i) => ({
  id: String(i + 1),
  name,
  city: 'Swabi',
  fee,
  freeDeliveryAbove: 2500,
  minimumOrder: min,
  estimatedMinutes: minutes,
  isActive: true,
  landmarks,
  createdAt: daysAgo(700),
}));

/* --------------------------------------------------------- 4. Suppliers */

const suppliers = [
  ['Swabi Halal Meat House', 'Haji Rehmat Gul', ['meat', 'poultry'], 'Net 7 days', 4.6],
  ['Mardan Poultry Traders', 'Zafar Iqbal', ['poultry'], 'Cash on delivery', 4.2],
  ['Jhangira Fresh Produce', 'Said Akbar', ['vegetables'], 'Daily settlement', 4.4],
  ['Peshawar Spice Company', 'Naeem Shinwari', ['spices'], 'Net 15 days', 4.8],
  ['Punjab Basmati Mills', 'Rana Shahid', ['rice-grains'], 'Net 30 days', 4.5],
  ['Swabi Dairy Supply', 'Fazal Wahab', ['dairy'], 'Weekly', 4.1],
  ['KP Cooking Oils Ltd', 'Adnan Butt', ['oils'], 'Net 15 days', 4.3],
  ['Frontier Charcoal & Fuel', 'Gul Rehman', ['fuel'], 'Cash on delivery', 4.0],
  ['Sardar Beverages Distribution', 'Waseem Khan', ['beverages'], 'Net 7 days', 4.4],
  ['Nowshera Packaging House', 'Imtiaz Ali', ['disposables'], 'Net 30 days', 3.9],
].map(([name, contactPerson, cats, paymentTerms, rating], i) => ({
  id: String(i + 1),
  name,
  contactPerson,
  phone: phoneFor(i + 400),
  email: `orders@${name.toLowerCase().replace(/[^a-z]+/g, '')}.pk`,
  address: `${pick(AREAS)}, ${pick(['Swabi', 'Mardan', 'Nowshera', 'Peshawar'])}, Khyber Pakhtunkhwa`,
  categories: cats,
  paymentTerms,
  rating,
  isActive: true,
  createdAt: daysAgo(int(300, 1400)),
}));

/* --------------------------------------------------------- 5. Inventory */

const INVENTORY_SEED = [
  ['Mutton (bone-in)', 'meat', 'kg', 1, 1450],
  ['Mutton (chops)', 'meat', 'kg', 1, 1700],
  ['Beef (boneless)', 'meat', 'kg', 1, 1150],
  ['Beef mince (coarse)', 'meat', 'kg', 1, 1100],
  ['Chicken (whole)', 'poultry', 'kg', 2, 620],
  ['Chicken thigh (boneless)', 'poultry', 'kg', 2, 780],
  ['Quail (batair)', 'poultry', 'piece', 2, 240],
  ['River fish (rahu)', 'seafood', 'kg', 1, 890],
  ['Tomato', 'vegetables', 'kg', 3, 160],
  ['Onion', 'vegetables', 'kg', 3, 130],
  ['Green chilli', 'vegetables', 'kg', 3, 220],
  ['Ginger', 'vegetables', 'kg', 3, 480],
  ['Garlic', 'vegetables', 'kg', 3, 520],
  ['Fresh coriander', 'vegetables', 'bundle', 6, 40],
  ['Mint', 'vegetables', 'bundle', 6, 40],
  ['Potato', 'vegetables', 'kg', 3, 110],
  ['Carrot', 'vegetables', 'kg', 3, 140],
  ['Capsicum', 'vegetables', 'kg', 3, 260],
  ['Basmati rice (super kernel)', 'rice-grains', 'kg', 5, 420],
  ['Urad daal (mash)', 'rice-grains', 'kg', 5, 380],
  ['Gram flour (besan)', 'rice-grains', 'kg', 5, 290],
  ['Wheat flour (maida)', 'rice-grains', 'kg', 5, 180],
  ['Red chilli powder', 'spices', 'kg', 4, 950],
  ['Turmeric', 'spices', 'kg', 4, 620],
  ['Coriander seed (ground)', 'spices', 'kg', 4, 700],
  ['Cumin seed', 'spices', 'kg', 4, 1800],
  ['Green cardamom', 'spices', 'kg', 4, 8500],
  ['Black pepper', 'spices', 'kg', 4, 2400],
  ['Pomegranate seed (anardana)', 'spices', 'kg', 4, 1600],
  ['Carom seed (ajwain)', 'spices', 'kg', 4, 1100],
  ['Rock salt', 'spices', 'kg', 4, 90],
  ['Yoghurt', 'dairy', 'kg', 6, 260],
  ['Cream', 'dairy', 'litre', 6, 480],
  ['Full-fat milk', 'dairy', 'litre', 6, 220],
  ['Butter', 'dairy', 'kg', 6, 1400],
  ['Desi ghee', 'oils', 'kg', 7, 2600],
  ['Cooking oil (canola)', 'oils', 'litre', 7, 560],
  ['Mustard oil', 'oils', 'litre', 7, 640],
  ['Green tea leaf', 'beverages', 'kg', 9, 1900],
  ['Black tea leaf', 'beverages', 'kg', 9, 1500],
  ['Soft drinks (1.5L crate)', 'beverages', 'packet', 9, 1650],
  ['Mineral water (1.5L crate)', 'beverages', 'packet', 9, 780],
  ['Cashew nuts', 'spices', 'kg', 4, 3800],
  ['Almonds (slivered)', 'spices', 'kg', 4, 3200],
  ['Black raisin', 'spices', 'kg', 4, 1400],
  ['Charcoal (hardwood)', 'fuel', 'kg', 8, 130],
  ['Firewood', 'fuel', 'bundle', 8, 850],
  ['LPG cylinder (45kg)', 'fuel', 'piece', 8, 12500],
  ['Takeaway containers (large)', 'disposables', 'packet', 10, 720],
  ['Paper bags', 'disposables', 'packet', 10, 450],
  ['Vanilla ice cream (5L)', 'dairy', 'piece', 6, 2200],
  ['Falooda vermicelli', 'bakery', 'kg', 5, 340],
];

const inventory = INVENTORY_SEED.map(([name, category, unit, supplierIdx, unitCost], i) => {
  const reorderLevel = category === 'spices' ? int(2, 6) : int(8, 30);
  // Deliberately leave a realistic slice of the store low or critical.
  const stockRatio = chance(0.12) ? rand() * 0.5 : chance(0.15) ? 0.5 + rand() * 0.6 : 1.1 + rand() * 3;
  const isPerishable = ['meat', 'poultry', 'seafood', 'vegetables', 'dairy', 'bakery'].includes(category);
  return {
    id: String(i + 1),
    sku: `SLT-${category.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
    name,
    category,
    unit,
    quantity: Math.max(0, Math.round(reorderLevel * stockRatio * 10) / 10),
    reorderLevel,
    reorderQuantity: reorderLevel * 3,
    unitCost,
    supplierId: String(supplierIdx),
    storageLocation: isPerishable
      ? pick(['Cold Room A', 'Cold Room B', 'Chiller 1', 'Chiller 2'])
      : pick(['Dry Store 1', 'Dry Store 2', 'Spice Rack', 'Back Yard']),
    expiryDate: isPerishable ? dateOnly(int(-2, 21)) : chance(0.4) ? dateOnly(int(60, 500)) : undefined,
    lastRestockedAt: daysAgo(int(0, 14)),
    isPerishable,
    isActive: true,
    createdAt: daysAgo(int(200, 1200)),
    updatedAt: daysAgo(int(0, 14)),
  };
});

const MOVEMENTS = ['purchase', 'kitchen-consumption', 'kitchen-consumption', 'kitchen-consumption', 'wastage', 'adjustment', 'return'];
const inventoryLogs = [];
for (let i = 0; i < 260; i++) {
  const item = pick(inventory);
  const movement = pick(MOVEMENTS);
  const magnitude = Math.max(0.5, Math.round(item.reorderLevel * (rand() * 0.6 + 0.1) * 10) / 10);
  const qtyChange = movement === 'purchase' || movement === 'return' ? magnitude : -magnitude;
  inventoryLogs.push({
    id: String(i + 1),
    inventoryItemId: item.id,
    itemName: item.name,
    movement,
    quantityChange: qtyChange,
    quantityAfter: Math.max(0, Math.round((item.quantity + rand() * 20) * 10) / 10),
    unitCost: movement === 'purchase' ? item.unitCost : undefined,
    totalCost: movement === 'purchase' ? Math.round(item.unitCost * magnitude) : undefined,
    reference: movement === 'purchase' ? `GRN-${2600 + i}` : undefined,
    supplierId: movement === 'purchase' ? item.supplierId : undefined,
    performedByName: pick(['Gulzar Ahmad', 'Rashid Ali Khan', 'Hidayat Ullah', 'Zahir Shah', 'Amjad Khan']),
    note:
      movement === 'wastage'
        ? pick(['Spoiled in the chiller', 'Dropped during prep', 'Past expiry', 'Damaged in transit'])
        : movement === 'adjustment'
          ? 'Physical count correction'
          : undefined,
    createdAt: daysAgo(int(0, 45), int(0, 12)),
  });
}
inventoryLogs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
inventoryLogs.forEach((l, i) => (l.id = String(i + 1)));

/* ------------------------------------------------------------- 6. Orders */

const ORDER_NOTES = [
  'Please make it extra spicy.',
  'No green chilli, children are eating.',
  'Call when you reach the gate.',
  'Pack the raita separately please.',
  'Need extra naan with the karahi.',
  'Ring the bell twice, the gate is at the back.',
  '',
  '',
  '',
];

const RIDERS = ['Sajid Iqbal', 'Khalid Mehmood'];

function buildOrderItems() {
  const lines = [];
  const n = int(1, 5);
  const chosen = pickMany(menu.filter((m) => m.isAvailable), n);
  for (const item of chosen) {
    const variant = pick(item.variants);
    const qty = int(1, item.basePrice < 100 ? 6 : 2);
    const addons = chance(0.35) ? pickMany(item.addons, int(1, 2)).map((a) => ({ name: a.name, price: a.price, quantity: int(1, 3) })) : [];
    const addonTotal = addons.reduce((s, a) => s + a.price * a.quantity, 0);
    lines.push({
      menuItemId: item.id,
      slug: item.slug,
      name: item.name,
      variantLabel: variant.label,
      image: item.image,
      unitPrice: variant.price,
      quantity: qty,
      addons,
      note: chance(0.15) ? pick(ORDER_NOTES.filter(Boolean)) : undefined,
      lineTotal: variant.price * qty + addonTotal,
    });
  }
  return lines;
}

const STATUS_BY_AGE = (ageDays) => {
  if (ageDays > 1) return chance(0.94) ? 'delivered' : 'cancelled';
  if (ageDays > 0.25) return pick(['delivered', 'delivered', 'delivered', 'cancelled']);
  return pick(['pending', 'accepted', 'preparing', 'ready', 'out-for-delivery', 'delivered']);
};

const STATUS_SEQUENCE = ['pending', 'accepted', 'preparing', 'ready', 'out-for-delivery', 'delivered'];

const orders = [];
const ORDER_COUNT = 240;
for (let i = 0; i < ORDER_COUNT; i++) {
  // Weighted toward recent days so the dashboard has a live feel.
  const ageDays = chance(0.25) ? rand() * 1 : chance(0.5) ? rand() * 14 : rand() * 120;
  const placedAt = new Date(NOW.getTime() - ageDays * 864e5);
  const customer = chance(0.78) ? pick(customers) : null;
  const items = buildOrderItems();
  const subtotal = items.reduce((s, l) => s + l.lineTotal, 0);
  const fulfilment = chance(0.55) ? 'delivery' : 'dine-in';
  const area = pick(deliveryAreas);
  let deliveryFee = fulfilment === 'delivery' ? (subtotal >= 2500 ? 0 : area.fee) : 0;
  const useCoupon = chance(0.18);
  const discount = useCoupon ? round(Math.min(subtotal * 0.1, 500)) : 0;
  const status = STATUS_BY_AGE(ageDays);
  const name = customer?.name ?? pick(ALL_NAMES);

  const timeline = [];
  const reached = status === 'cancelled' ? int(1, 3) : STATUS_SEQUENCE.indexOf(status) + 1;
  const stepMinutes = [0, int(2, 8), int(4, 12), int(12, 28), int(3, 9), int(10, 30)];
  let cursor = placedAt.getTime();
  for (let s = 0; s < reached; s++) {
    if (fulfilment === 'dine-in' && STATUS_SEQUENCE[s] === 'out-for-delivery') continue;
    cursor += stepMinutes[s] * 6e4;
    timeline.push({ status: STATUS_SEQUENCE[s], at: iso(cursor), byName: s === 0 ? name : pick(['Rashid Ali Khan', 'Gulzar Ahmad', 'Noor Muhammad']) });
  }
  if (status === 'cancelled') {
    cursor += int(5, 40) * 6e4;
    timeline.push({ status: 'cancelled', at: iso(cursor), note: 'Cancelled', byName: 'Rashid Ali Khan' });
  }

  orders.push({
    id: String(i + 1),
    reference: `SLT-${24000 + i}`,
    customerId: customer?.id ?? null,
    customerName: name,
    customerPhone: customer?.phone ?? phoneFor(i + 900),
    customerEmail: customer?.email,
    fulfilment,
    paymentMethod: fulfilment === 'delivery' ? 'cash-on-delivery' : 'cash-at-counter',
    status,
    items,
    subtotal,
    discount,
    couponCode: useCoupon ? pick(['SALATEEN10', 'FAMILY500', 'FREEDEL']) : undefined,
    deliveryFee,
    tax: 0,
    grandTotal: subtotal - discount + deliveryFee,
    deliveryAddress:
      fulfilment === 'delivery'
        ? customer?.addresses?.[0] ?? {
            line1: `House ${int(1, 300)}, Street ${int(1, 20)}`,
            area: area.name,
            city: 'Swabi',
            phone: phoneFor(i + 900),
          }
        : undefined,
    deliveryAreaId: fulfilment === 'delivery' ? area.id : undefined,
    estimatedReadyAt: iso(placedAt.getTime() + int(25, 55) * 6e4),
    note: pick(ORDER_NOTES) || undefined,
    timeline,
    cancelReason: status === 'cancelled' ? pick(['Customer unreachable', 'Item unavailable', 'Duplicate order', 'Customer changed plans']) : undefined,
    assignedRiderName: fulfilment === 'delivery' && ['out-for-delivery', 'delivered'].includes(status) ? pick(RIDERS) : undefined,
    placedVia: chance(0.7) ? 'web' : chance(0.6) ? 'phone' : 'walk-in',
    createdAt: iso(placedAt),
    updatedAt: timeline.length ? timeline[timeline.length - 1].at : iso(placedAt),
  });
}
orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
orders.forEach((o, i) => {
  o.id = String(i + 1);
  o.reference = `SLT-${24500 - i}`;
});

/* ------------------------------------------------------- 7. Reservations */

const ZONES = ['indoor', 'family-hall', 'outdoor'];
const OCCASION_KEYS = ['', 'birthday', 'anniversary', 'family-gathering', 'business-lunch', 'walima', 'graduation'];
const SLOT_TIMES = ['12:00', '12:30', '13:00', '13:30', '14:00', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];

const reservations = [];
for (let i = 0; i < 64; i++) {
  const offset = int(-40, 30);
  const customer = chance(0.7) ? pick(customers) : null;
  const zone = pick(ZONES);
  const guests = zone === 'family-hall' ? int(6, 24) : int(2, 10);
  const zoneTables = tables.filter((t) => t.zone === zone && t.seats >= guests);
  const table = zoneTables.length ? pick(zoneTables) : null;
  const status =
    offset < -1
      ? pick(['completed', 'completed', 'completed', 'no-show', 'cancelled'])
      : offset < 0
        ? pick(['completed', 'seated'])
        : offset === 0
          ? pick(['confirmed', 'confirmed', 'pending', 'seated'])
          : pick(['confirmed', 'confirmed', 'pending', 'rejected']);
  const created = daysAgo(Math.max(0, -offset) + int(1, 8));
  reservations.push({
    id: String(i + 1),
    reference: `RSV-${8100 + i}`,
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? pick(ALL_NAMES),
    customerPhone: customer?.phone ?? phoneFor(i + 700),
    customerEmail: customer?.email,
    date: dateOnly(offset),
    time: pick(SLOT_TIMES),
    guests,
    zone,
    tableId: ['confirmed', 'seated', 'completed'].includes(status) ? (table?.id ?? null) : null,
    tableCode: ['confirmed', 'seated', 'completed'].includes(status) ? table?.code : undefined,
    occasion: pick(OCCASION_KEYS) || undefined,
    note: chance(0.3) ? pick(['High chair needed for a toddler.', 'Prefer a corner table.', 'Celebrating a birthday, please arrange a cake stand.', 'Guest uses a wheelchair.']) : undefined,
    status,
    confirmedAt: ['confirmed', 'seated', 'completed'].includes(status) ? daysAgo(Math.max(0, -offset) + int(0, 3)) : undefined,
    rejectionReason: status === 'rejected' ? pick(['Fully booked at that time', 'Family hall reserved for a private event', 'Requested party size exceeds capacity']) : undefined,
    seatedAt: ['seated', 'completed'].includes(status) ? daysAgo(Math.max(0, -offset)) : undefined,
    durationMinutes: 90,
    source: chance(0.65) ? 'web' : chance(0.7) ? 'phone' : 'walk-in',
    createdAt: created,
    updatedAt: created,
  });
}

/* ---------------------------------------------------- 8. Content records */

const banners = [
  {
    eyebrow: 'Since 2011 on Jhangira Road',
    title: 'Charcoal, Copper & Kabuli Rice',
    subtitle:
      'Swabi’s table for hand-turned BBQ, Chapli Kabab pressed to order and a platter built to feed ten.',
    image: IMG.bbq.fire,
    ctaLabel: 'Explore the Menu',
    ctaLink: '/menu',
    secondaryCtaLabel: 'Book a Table',
    secondaryCtaLink: '/reservation',
  },
  {
    eyebrow: 'The dish they drive in for',
    title: 'Kabuli Pulao, Steamed Over Mutton Stock',
    subtitle: 'Caramelised carrot, black raisin and slivered almond over long-grain rice.',
    image: IMG.food.kabuli,
    ctaLabel: 'Order Kabuli Pulao',
    ctaLink: '/menu/kabuli-pulao',
    secondaryCtaLabel: 'See all rice',
    secondaryCtaLink: '/menu/c/pulao-rice',
  },
  {
    eyebrow: 'One tray, ten hands',
    title: 'The Grand Platter',
    subtitle: 'Mutton roash, chicken tikka, beef seekh and chapli kabab over Kabuli rice.',
    image: IMG.food.grand,
    ctaLabel: 'See the Platter',
    ctaLink: '/menu/grand-platter-for-ten',
    secondaryCtaLabel: 'Catering enquiries',
    secondaryCtaLink: '/catering',
  },
  {
    eyebrow: 'Family halls with full purdah',
    title: 'Room For Every Occasion',
    subtitle: 'Three halls, a partitioned family wing and a lawn beside the grill pits.',
    image: IMG.int.family,
    ctaLabel: 'Reserve a Hall',
    ctaLink: '/reservation',
    secondaryCtaLabel: 'View the gallery',
    secondaryCtaLink: '/gallery',
  },
].map((b, i) => ({
  id: String(i + 1),
  ...b,
  sortOrder: i + 1,
  isActive: true,
  createdAt: daysAgo(int(30, 400)),
}));

const offers = [
  {
    slug: 'family-friday-platter',
    title: 'Family Friday Platter',
    subtitle: 'Grand Platter for ten, plus a full tray of Kabuli Pulao',
    description:
      'Every Friday from 12pm, the Grand Platter comes with a complimentary full tray of Kabuli Pulao and unlimited sabz chai for the table. Dine-in only, in the family hall or the main hall.',
    image: IMG.food.grand,
    badge: 'Fridays only',
    originalPrice: 8700,
    offerPrice: 6900,
    couponCode: 'FAMILY500',
    terms: ['Dine-in only', 'Fridays 12:00 to 16:00', 'Minimum 8 guests', 'Cannot be combined with other offers'],
    isFeatured: true,
  },
  {
    slug: 'free-home-delivery',
    title: 'Free Home Delivery',
    subtitle: 'On every order above Rs 2,500 inside Swabi city',
    description:
      'Order above Rs 2,500 and we deliver free anywhere inside Swabi city and Mal Lar. Cash on delivery, as always.',
    image: IMG.brand.delivery,
    badge: 'Always on',
    couponCode: 'FREEDEL',
    terms: ['Swabi city and Mal Lar only', 'Minimum order Rs 2,500', 'Cash on delivery'],
    isFeatured: true,
  },
  {
    slug: 'bbq-night-tuesdays',
    title: 'BBQ Night',
    subtitle: 'Twenty percent off everything from the coals',
    description:
      'Every Tuesday after 7pm the whole charcoal section drops twenty percent. Seekh, tikka, chops, quail and fish.',
    image: IMG.bbq.seekh,
    badge: 'Tuesdays',
    discountPercent: 20,
    couponCode: 'BBQ20',
    terms: ['Tuesdays after 19:00', 'BBQ category only', 'Dine-in and takeaway'],
    isFeatured: true,
  },
  {
    slug: 'student-lunch-deal',
    title: 'Student Lunch',
    subtitle: 'Karahi, naan and sabz chai for one',
    description:
      'Show a valid student card from GIK, Swabi University or any local college and get half chicken karahi, two naan and sabz chai for a flat rate.',
    image: IMG.food.chickenPot,
    badge: 'Weekdays',
    originalPrice: 380,
    offerPrice: 299,
    terms: ['Valid student ID required', 'Monday to Thursday, 12:00 to 16:00', 'Dine-in only'],
    isFeatured: false,
  },
  {
    slug: 'walima-catering-package',
    title: 'Walima & Mehndi Catering',
    subtitle: 'Full-service catering from 100 guests upwards',
    description:
      'Deghs of Kabuli Pulao, mutton karahi, chapli kabab and BBQ delivered hot to your venue anywhere in Swabi district, with servers and chafing dishes included.',
    image: IMG.food.feast,
    badge: 'From 100 guests',
    terms: ['Book at least 7 days ahead', 'Fifty percent advance', 'Serving staff included above 200 guests'],
    isFeatured: true,
  },
  {
    slug: 'first-order-ten-percent',
    title: 'Ten Percent Off Your First Order',
    subtitle: 'New here? Use SALATEEN10 at checkout',
    description: 'A welcome discount on your first online order, up to Rs 500.',
    image: IMG.food.bbqSalad,
    badge: 'New customers',
    discountPercent: 10,
    couponCode: 'SALATEEN10',
    terms: ['First online order only', 'Maximum discount Rs 500', 'Minimum order Rs 1,000'],
    isFeatured: false,
  },
  {
    slug: 'chai-and-chapli',
    title: 'Chai & Chapli',
    subtitle: 'Half kilo chapli kabab, two naan and a pot of sabz chai',
    description: 'The afternoon order. Available every day between 3pm and 6pm.',
    image: IMG.food.chapliNaan,
    badge: 'Daily 3-6pm',
    originalPrice: 265,
    offerPrice: 220,
    terms: ['Daily 15:00 to 18:00', 'Dine-in and takeaway'],
    isFeatured: false,
  },
  {
    slug: 'birthday-table',
    title: 'Birthday Table',
    subtitle: 'Complimentary sundae and cake stand for the guest of honour',
    description:
      'Tell us it is a birthday when you book and the house fruit sundae, a cake stand and the candles are on us.',
    image: IMG.food.dessert,
    badge: 'On reservation',
    terms: ['Mention the occasion when booking', 'Minimum 6 guests', 'One sundae per booking'],
    isFeatured: false,
  },
].map((o, i) => ({
  id: String(i + 1),
  ...o,
  startsAt: daysAgo(int(10, 120)),
  endsAt: daysAhead(int(20, 200)),
  isActive: true,
  createdAt: daysAgo(int(20, 200)),
}));

const coupons = [
  ['SALATEEN10', 'Ten percent off', 'percentage', 10, 1000, 500],
  ['FAMILY500', 'Rs 500 off family platters', 'fixed', 500, 5000, null],
  ['FREEDEL', 'Free home delivery', 'free-delivery', 0, 2500, null],
  ['BBQ20', 'Twenty percent off BBQ', 'percentage', 20, 800, 800],
  ['WELCOME150', 'Rs 150 off your first order', 'fixed', 150, 800, null],
  ['CHAI50', 'Rs 50 off orders above Rs 600', 'fixed', 50, 600, null],
  ['EID25', 'Eid special, twenty five percent off', 'percentage', 25, 2000, 1500],
  ['STUDENT15', 'Fifteen percent student discount', 'percentage', 15, 500, 300],
].map(([code, title, type, value, minimumOrder, maxDiscount], i) => ({
  id: String(i + 1),
  code,
  title,
  description: `${title}. Applies at checkout on qualifying orders.`,
  type,
  value,
  minimumOrder,
  maxDiscount,
  usageLimit: [500, 200, 0, 300, 1000, 400, 250, 600][i],
  usedCount: int(12, 180),
  perCustomerLimit: [1, 3, 0, 5, 1, 10, 2, 20][i],
  startsAt: daysAgo(int(30, 200)),
  expiresAt: daysAhead(i === 6 ? -14 : int(30, 240)),
  isActive: i !== 6,
  createdAt: daysAgo(int(40, 220)),
}));

const chefs = [
  {
    slug: 'gulzar-ahmad',
    name: 'Gulzar Ahmad',
    title: 'Head Chef',
    bio: 'Gulzar started on the tandoor in Mardan at fourteen and has run the Salateen kitchen since the restaurant opened. He still checks every degh of Kabuli Pulao himself before it leaves the pass, and he will tell you, at length, that the secret is the stock and nothing else.',
    photo: IMG.bbq.chef,
    yearsExperience: 27,
    specialities: ['Kabuli Pulao', 'Mutton Dumpukht', 'Shinwari Karahi'],
    quote: 'Rice does not forgive a weak stock. Everything else you can fix.',
    isFeatured: true,
  },
  {
    slug: 'fazal-rabi',
    name: 'Fazal Rabi',
    title: 'Grill Master',
    bio: 'Fazal runs the charcoal pits. Fourteen years of turning skewers by hand have given him a sense for the coals that no thermometer replaces. He lights the fire at four every afternoon and does not leave it until closing.',
    photo: IMG.bbq.seekh,
    yearsExperience: 14,
    specialities: ['Beef Seekh Kabab', 'Charcoal Mutton Chops', 'Batair Roast'],
    quote: 'Good coals are grey, not red. Red coals burn the outside and leave the middle raw.',
    isFeatured: true,
  },
  {
    slug: 'hidayat-ullah',
    name: 'Hidayat Ullah',
    title: 'Karahi Chef',
    bio: 'Hidayat handles the copper pans. On a Friday evening he will run six karahis at once across two burners without writing anything down.',
    photo: IMG.bbq.karahiFire,
    yearsExperience: 11,
    specialities: ['Mutton Karahi', 'Chicken White Karahi', 'Achari Karahi'],
    quote: 'A karahi is finished when the oil comes up clear. Not a minute before.',
    isFeatured: true,
  },
  {
    slug: 'shakeel-ahmad',
    name: 'Shakeel Ahmad',
    title: 'Tandoor Baker',
    bio: 'Shakeel has been at the tandoor for nine years. Naan leaves his hands and reaches the table in under two minutes, which is the only standard he accepts.',
    photo: IMG.food.chapliNaan,
    yearsExperience: 9,
    specialities: ['Tandoori Naan', 'Roghni Naan', 'Garlic Kulcha'],
    quote: 'Bread that waits on the counter is bread you should not have made.',
    isFeatured: false,
  },
].map((c, i) => ({
  id: String(i + 1),
  ...c,
  signatureItemIds: pickMany(menu.filter((m) => m.isChefRecommended), 3).map((m) => m.id),
  createdAt: daysAgo(int(300, 1400)),
}));

const TESTIMONIAL_SEED = [
  ['Asad Khan', 'Swabi', 5, 'The full platter genuinely feeds ten', 'We were a party of eleven for my brother’s graduation and one platter plus a tray of pulao was more than enough. Bill came to about six thousand. I have not found value like this anywhere between Swabi and Peshawar.', 'Family gathering, 11 guests'],
  ['Rabia Noor', 'Mardan', 5, 'The Kabuli Pulao is worth the drive', 'We come from Mardan roughly once a month purely for the Kabuli Pulao. The rice is never sticky and the mutton underneath is always tender. The green tea keeps arriving without asking.', 'Regular visitor'],
  ['Imran Shah', 'Topi', 4, 'Chapli kabab like Peshawar', 'Proper coarse mince, proper anardana, fried in beef fat the way it should be. Service slowed down a little at peak time but the food made up for it.', 'Dinner for four'],
  ['Hina Gul', 'Swabi', 5, 'Family hall was perfect for us', 'Booked the family hall for a walima reception of about thirty. Full purdah, clean, and the staff were respectful throughout. The manager arranged everything over the phone.', 'Walima, 30 guests'],
  ['Kamran Khattak', 'Nowshera', 4, 'Best BBQ on this road', 'The seekh kabab and the mutton chops are the reason I stop here on every trip to Swabi. Chops were slightly dry once but they replaced them without an argument.', 'Frequent traveller'],
  ['Sana Ullah', 'Swabi', 5, 'Quail roast was a surprise', 'Ordered the batair roast on the waiter’s recommendation and it was the best thing on the table. Also try the fish fry in winter.', 'Dinner for six'],
  ['Zubair Marwat', 'Swabi', 5, 'Delivery arrived hot', 'Ordered a full chicken karahi and naan to Mal Lar. Arrived in under thirty minutes and still steaming. Free delivery because the order was over 2,500.', 'Home delivery'],
  ['Farah Naz', 'Swabi', 4, 'Kids loved the white handi', 'The white handi has no chilli at all, which made it the only thing my children would eat. Big portions and the sundae for dessert made it a good evening.', 'Family dinner'],
  ['Tariq Mehmood', 'Peshawar', 5, 'Shinwari karahi done properly', 'Salt, tomato and fat, nothing else. That is how it should be and that is how they make it. The lawn seating beside the grill pits is worth asking for.', 'Lunch for eight'],
  ['Naveed Anwar', 'Swabi', 4, 'Reliable for large groups', 'We book here for office lunches every couple of months. Never had a problem getting a table for twenty with a day’s notice.', 'Business lunch, 20 guests'],
  ['Maria Khan', 'Swabi', 5, 'Green tea and chapli in the afternoon', 'The chai and chapli deal in the afternoon is my regular. Rs 220 and it is a proper meal.', 'Afternoon regular'],
  ['Waqar Zeb', 'Kalu Khan', 5, 'Catering for our mehndi', 'They catered our mehndi for a hundred and forty guests. Deghs arrived on time, hot, and the servers stayed until the end. Everyone asked where the pulao came from.', 'Mehndi catering, 140 guests'],
];
const testimonials = TESTIMONIAL_SEED.map(([name, location, rating, title, quote, visitContext], i) => ({
  id: String(i + 1),
  name,
  location,
  avatar: null,
  rating,
  title,
  quote,
  visitContext,
  isFeatured: i < 6,
  isApproved: true,
  createdAt: daysAgo(int(5, 400)),
}));

const REVIEW_TITLES = [
  'Exactly as described', 'Would order again', 'Generous portion', 'Great flavour',
  'Solid choice', 'A bit slow but worth it', 'Family favourite', 'Better than expected',
  'Consistent every time', 'Hot and fresh on arrival',
];
const REVIEW_BODIES = [
  'Portion size was larger than we expected and easily fed the whole table. Will order again.',
  'Cooked properly and seasoned well. The chilli level was right for us but ask for mild if you have children.',
  'Arrived hot and well packed. Nothing spilled on the way, which is more than I can say for most places.',
  'Good value for the price. We ordered for four and had leftovers.',
  'Flavour was excellent. Took a little longer than the estimate on a Friday night but that is expected.',
  'This is the dish I keep coming back for. Consistent every single time.',
  'Tender and not greasy at all. The naan alongside was fresh out of the tandoor.',
  'Ordered this for a family lunch and everyone finished their plate. That never happens.',
];
const reviews = [];
for (let i = 0; i < 86; i++) {
  const item = pick(menu);
  const customer = pick(customers);
  const rating = chance(0.62) ? 5 : chance(0.7) ? 4 : chance(0.6) ? 3 : 2;
  reviews.push({
    id: String(i + 1),
    menuItemId: item.id,
    orderId: chance(0.7) ? pick(orders).id : null,
    customerId: customer.id,
    customerName: customer.name,
    rating,
    title: pick(REVIEW_TITLES),
    body: pick(REVIEW_BODIES),
    images: [],
    isApproved: !chance(0.12),
    reply: chance(0.25) ? 'Thank you for taking the time to write. We hope to see you again soon. - Salateen Restaurant' : undefined,
    repliedAt: undefined,
    helpfulCount: int(0, 34),
    createdAt: daysAgo(int(0, 300)),
  });
}
reviews.forEach((r) => {
  if (r.reply) r.repliedAt = iso(new Date(r.createdAt).getTime() + int(2, 48) * 36e5);
});

const GALLERY_SEED = [
  [IMG.ext.day, 'The shopfront on Jhangira Road', 'exterior', 'The signboard people look for when the smell of charcoal reaches the road.'],
  [IMG.ext.evening, 'Evening on the main road', 'exterior', 'Doors open until midnight, every day of the year.'],
  [IMG.ext.terrace, 'Marquee seating on a winter night', 'exterior', 'The red marquees go up when the lawn gets cold.'],
  [IMG.ext.parking, 'Free parking after dark', 'exterior', 'Room for thirty cars, free of charge.'],
  [IMG.ext.garden, 'The garden wing', 'exterior', 'Quiet side entrance leading to the lawn.'],
  [IMG.ext.neon, 'Neon after ten', 'exterior', 'The sign that tells Jhangira Road we are still serving.'],
  [IMG.ext.entrance, 'Main entrance', 'exterior', 'Straight through to the blue-tiled hall.'],
  [IMG.int.mural, 'The mural wall', 'interior', 'Hand-painted mountains along the length of the main hall.'],
  [IMG.int.hall, 'Main dining hall', 'interior', 'Blue tile, blue tables, room for a hundred.'],
  [IMG.int.family, 'Family hall at night', 'interior', 'Chandeliers, partitioned seating and full purdah.'],
  [IMG.int.corridor, 'The tiled corridor', 'interior', 'The walk between the main hall and the family wing.'],
  [IMG.int.lounge, 'Mural lounge', 'interior', 'Floor seating for guests who prefer it.'],
  [IMG.int.banquet, 'Banquet layout', 'interior', 'Set for a party of forty.'],
  [IMG.int.seating, 'Ready for service', 'interior', 'Tables laid before the evening rush.'],
  [IMG.int.wide, 'The hall from the pass', 'interior', 'What the kitchen sees at six in the evening.'],
  [IMG.bbq.karahiFire, 'The open karahi', 'bbq', 'Fish and chops go into the wide pan over a wood fire.'],
  [IMG.bbq.chef, 'Turning skewers', 'bbq', 'Fazal Rabi at the pits, where he stays until closing.'],
  [IMG.bbq.seekh, 'Seekh on the coals', 'bbq', 'Beef seekh, turned by hand, never by machine.'],
  [IMG.bbq.tikka, 'Tikka lined up', 'bbq', 'Twelve hours in the marinade before it reaches the fire.'],
  [IMG.bbq.chicken, 'Chicken skewers at full heat', 'bbq', 'The busiest metre in the building.'],
  [IMG.bbq.fire, 'Wood fire under the karahi', 'bbq', 'Hardwood, not gas. It matters.'],
  [IMG.food.karahi, 'Karahi close up', 'food', 'Oil risen clear, which is how you know it is done.'],
  [IMG.food.seekhPlate, 'Seekh kabab plated', 'food', 'Four to a plate with onion and lemon.'],
  [IMG.food.roast, 'Chicken roast', 'food', 'Skin lacquered, brought out whole.'],
  [IMG.food.bbqSalad, 'BBQ platter with salad', 'food', 'The mixed grill, built for two.'],
  [IMG.food.grand, 'The Grand Platter', 'food', 'One tray, ten hands, six thousand rupees.'],
  [IMG.food.kabuli, 'Kabuli Pulao', 'food', 'Carrot, raisin and almond over stock-steamed rice.'],
  [IMG.food.muttonHandi, 'Mutton roash in the pot', 'food', 'Simmered in clear stock until it gives way.'],
  [IMG.food.chapliNaan, 'Chapli kabab with naan', 'food', 'Straight from the pan to the table.'],
  [IMG.food.pulaoTray, 'A full tray of pulao', 'food', 'What a wedding order looks like.'],
  [IMG.food.muttonPulaoBbq, 'Pulao under grilled mutton', 'food', 'The platter everyone photographs.'],
  [IMG.food.dumpukht, 'Dumpukht, lid off', 'food', 'Two hours sealed, opened at the table.'],
  [IMG.food.karahiClay, 'Mutton karahi in clay', 'food', 'Tomato, ginger, green chilli. Nothing else.'],
  [IMG.food.chapliPlate, 'Chapli kabab plated', 'food', 'Wide, flat and studded with pomegranate seed.'],
  [IMG.food.platter, 'Mixed grill with salad', 'food', 'Seekh, tikka and chops on one plate.'],
  [IMG.food.dessert, 'House fruit sundae', 'food', 'The birthday dessert.'],
  [IMG.food.muttonPulao, 'Mutton pulao platter', 'food', 'Served family style for four to six.'],
  [IMG.food.feast, 'A table mid-feast', 'food', 'Friday evening, family hall.'],
  [IMG.food.qeema, 'Qeema and qorma', 'food', 'The everyday order.'],
  [IMG.food.chickenPot, 'Chicken karahi in the pot', 'food', 'Cooked to order, never held.'],
  [IMG.food.whiteHandi, 'White handi', 'food', 'Cashew and cream, no chilli at all.'],
  [IMG.amb.guests, 'Guests outside at dusk', 'ambience', 'The car park fills up around seven.'],
  [IMG.amb.family, 'A family at the table', 'ambience', 'Naan, karahi, raita and green tea.'],
  [IMG.amb.lounge, 'Guests in the lounge', 'ambience', 'Floor seating for a longer evening.'],
  [IMG.amb.evening, 'An evening table', 'ambience', 'The hall stays full until eleven.'],
  [IMG.amb.garden, 'On the lawn', 'ambience', 'Outdoor tables beside the grill pits.'],
  [IMG.brand.menuCard, 'The printed menu card', 'brand', 'Prices on this site are transcribed from this card.'],
  [IMG.brand.promo, 'Promotional flyer', 'brand', 'Whole goat and chicken orders for functions.'],
  [IMG.brand.delivery, 'Free home delivery flyer', 'brand', 'Free delivery within the city on 0312-0991116.'],
];
const gallery = GALLERY_SEED.map(([image, title, category, caption], i) => ({
  id: String(i + 1),
  title,
  caption,
  image,
  category,
  width: 1600,
  height: 1200,
  sortOrder: i + 1,
  isFeatured: i % 5 === 0,
  createdAt: daysAgo(int(10, 700)),
}));

const menuImages = menu.flatMap((m, mi) =>
  [m.image, ...m.gallery].map((image, gi) => ({
    id: `${mi + 1}-${gi + 1}`,
    menuItemId: m.id,
    image,
    alt: `${m.name} at Salateen Restaurant Swabi`,
    isPrimary: gi === 0,
    sortOrder: gi + 1,
  })),
);

const BLOG_SEED = [
  {
    slug: 'what-makes-a-real-kabuli-pulao',
    title: 'What Makes a Real Kabuli Pulao',
    category: 'Kitchen Notes',
    excerpt: 'Everyone claims it. Very few earn it. Our head chef on stock, rice and the twenty minutes that decide everything.',
    cover: IMG.food.kabuli,
    tags: ['kabuli-pulao', 'technique', 'rice'],
    body: `Ask ten cooks in Khyber Pakhtunkhwa how to make Kabuli Pulao and you will get ten answers. Ask Gulzar Ahmad, who has run this kitchen since 2011, and you get one: it is the stock, and everything else is detail.

## The stock is the dish

We start the yakhni before the restaurant opens. Mutton on the bone, whole black cardamom, a little cumin, and enough water to cover. It sits at a bare simmer for close to three hours. Nothing is added to make it darker or richer, because anything you add to compensate is a confession that the stock was thin.

A weak stock gives you rice that tastes of water and spice. You can add more spice. It will not help. The grain has already decided what it is going to taste like.

## Rice that stays separate

We use super kernel basmati and we soak it for forty minutes, no longer. Over-soaked rice breaks in the pot and gives you a pulao that eats like a biryani that lost its nerve.

The rice goes into the boiling stock and comes out at seventy percent. That number matters. It finishes in the steam, not in the liquid.

## Carrot, raisin, almond

- Carrot is cut into matchsticks and caramelised separately in ghee with a pinch of sugar. It goes on at the end so it keeps its edge.
- Black raisin is plumped in warm stock, never water.
- Almond is slivered the same morning. Yesterday's almond tastes of the tin.

## Twenty minutes of dum

The pot is sealed and set over the lowest flame we can manage for twenty minutes. Nobody opens it. Nobody stirs it. This is the part every home cook rushes and it is the part that separates a good pulao from the one people drive in from Mardan for.

When the lid comes off, every grain should stand apart, and the mutton underneath should give way to a spoon. That is the whole test.`,
  },
  {
    slug: 'the-charcoal-question',
    title: 'The Charcoal Question: Why We Have Never Moved to Gas',
    category: 'Kitchen Notes',
    excerpt: 'Gas is cleaner, cheaper and easier. We still light hardwood every afternoon at four. Here is why.',
    cover: IMG.bbq.fire,
    tags: ['bbq', 'charcoal', 'technique'],
    body: `Every year somebody suggests we convert the grill pits to gas. The arguments are always good ones. Gas is cheaper. It is cleaner. It does not need a man standing beside it from four in the afternoon until midnight.

We have not done it, and we are not going to.

## What charcoal actually does

A gas flame heats by convection. Hot air moves across the meat and cooks it from the outside in. Charcoal heats mostly by radiation, and radiant heat behaves differently: it drives into the surface fast, sets a crust in seconds, and leaves the interior alone long enough to stay wet.

That crust is where the flavour lives. On a seekh kabab it is the difference between a piece of grilled mince and something worth ordering twice.

## Grey coals, not red

Fazal Rabi, who runs our pits, has one rule he repeats to every new hand: wait for the grey.

Red coals are still burning off volatiles. They flare, they smoke sourly, and they scorch the outside before the middle has warmed. Grey coals are past that stage and give a steady radiant heat you can actually work with.

This is why we light at four for a service that starts at seven.

## The part nobody sees

Charcoal is inconsistent. Every sack is a little different. A gas burner set to a number is the same on Monday and Friday; a coal bed is not. The only way to work with it is to have somebody who reads it by eye and by the back of their hand.

That person is the reason we can serve four hundred skewers on a Friday night without a single one going out dry. No thermostat replaces them.`,
  },
  {
    slug: 'how-to-order-for-a-party-of-twenty',
    title: 'How to Order for a Party of Twenty',
    category: 'Guides',
    excerpt: 'A practical guide to feeding a large table at Salateen without over-ordering or leaving anyone short.',
    cover: IMG.food.feast,
    tags: ['groups', 'catering', 'guide'],
    body: `We seat large tables every day and the same two mistakes come up. People either order one dish per person, which leaves half of it uneaten, or they order too conservatively and end up adding at the end when the kitchen is at its busiest.

Here is what actually works.

## The rule of thumb

For twenty adults, budget roughly:

- Two Grand Platters (serves 10 each), or
- One Grand Platter plus a full tray of Kabuli Pulao and two full karahis

Add three to four kilos of BBQ across seekh, tikka and chops. Add twenty-five to thirty naan. Add two portions of daal mash and one mix sabzi for anyone who wants a break from meat.

## Order the pulao first

Kabuli Pulao takes thirty-five minutes and a full tray takes longer. If you tell us the pulao when you sit down rather than when the BBQ arrives, everything reaches the table together.

## What to ask for

- A corner of the main hall or the family hall. Both take twenty comfortably.
- One karahi mild if children are eating. The white karahi or white handi has no chilli at all.
- Raita and salad per six people, not per person.

## What not to over-order

Naan. Every table over-orders naan. Order twenty and add more if you need them; they take ninety seconds.

## Give us a call

For twenty or more, a phone call on 0312-0991116 an hour ahead means the deghs are already on when you arrive. It costs nothing and it saves you forty minutes.`,
  },
  {
    slug: 'chapli-kabab-a-short-history',
    title: 'Chapli Kabab: A Short History of a Flat Kabab',
    category: 'Culture',
    excerpt: 'Why the Peshawari kabab is flat, why it contains pomegranate seed, and what most versions get wrong.',
    cover: IMG.food.chapliPlate,
    tags: ['chapli-kabab', 'history', 'peshawar'],
    body: `The name comes from *chaprikh*, the Pashto word for flat. That is the whole explanation, and it is also the first thing most recipes outside the region get wrong: a chapli kabab that is thick is not a chapli kabab.

## Why flat

Flatness is not decoration. A wide, thin disc gives you the maximum ratio of crust to interior, which is the entire point of a kabab shallow-fried rather than grilled. Thicken it and you get a patty that steams in its own moisture.

## The pomegranate seed

Dried pomegranate seed, *anardana*, does two things. It provides acid, which the beef needs, and it provides small pockets of moisture that burst during frying. Lemon juice cannot replace it. Vinegar certainly cannot.

## Coarse, not fine

The mince must be coarse. Fine mince binds into a paste and eats like a sausage. We grind ours on the widest plate and we do not overwork it. If the mix looks like it will fall apart, it is about right.

## The fat matters

We fry in beef fat. This is not nostalgia. The fat carries flavour back into the kabab as it cooks and gives the crust a texture that oil does not.

## The tomato slice

The tomato slice pressed into the top is not garnish either. It protects the surface as it fries and steams the top of the kabab while the bottom crusts. Remove it and you get an even kabab, which sounds better and eats worse.`,
  },
  {
    slug: 'why-our-green-tea-never-stops',
    title: 'Why the Green Tea Never Stops Arriving',
    category: 'Culture',
    excerpt: 'Sabz chai costs fifteen rupees and we lose money on almost every cup. We are not going to change that.',
    cover: IMG.food.gravy,
    tags: ['chai', 'hospitality', 'culture'],
    body: `Our menu card lists sabz chai at fifteen rupees. It has been at that price for a long time and, at current leaf and gas costs, we make almost nothing on it and often less than nothing.

We are asked about this fairly often, usually by people who mean it kindly.

## Melmastia

In Pashtun custom, hospitality is not a service you sell. *Melmastia* is an obligation on the host, extended without expectation of return and without regard to who the guest is. Charging a guest properly for tea would be, in a small but real way, a failure of that.

So the tea keeps coming. Nobody counts the cups.

## What we actually sell

The economics work because tea is not the product. The karahi is the product. The pulao is the product. The tea is the reason a family stays for two hours instead of forty minutes, and the reason they come back in three weeks.

If you want to reduce it to arithmetic, it is the best marketing spend in the building. But that is not really why we do it.

## How it is made

Green leaf, green cardamom, sugar to taste, poured from height so it aerates on the way into the cup. The pouring is not showmanship; it cools the tea to drinking temperature and lifts the cardamom.

Ask for it without sugar and we will bring it without sugar. Ask for a second pot and we will bring that too.`,
  },
  {
    slug: 'inside-the-family-hall',
    title: 'Inside the Family Hall',
    category: 'The Restaurant',
    excerpt: 'How the partitioned family wing works, who it is for, and how to book it.',
    cover: IMG.int.family,
    tags: ['family-hall', 'reservations', 'privacy'],
    body: `When we planned the building in 2011, the family hall was the first room we drew. In Swabi it is not an amenity, it is the difference between a restaurant a family can use and one they cannot.

## How it is arranged

The hall holds eight tables behind full-height partitions, each screened so that no table is visible from another or from the corridor. Service is by a dedicated attendant who announces before entering. Tables seat from six to twelve.

## Who it is for

Families, obviously. But also:

- Women dining without male relatives
- Small walima and mehndi receptions of up to forty
- Anybody who simply wants a quiet table

There is no minimum spend and no surcharge.

## Booking it

Individual tables can be booked through the reservation page or by phone. For the whole hall, call 0312-0991116 at least three days ahead. We will hold it without a deposit for parties under forty.

## What to ask for

Tell us the occasion when you book. Birthdays get a cake stand and the house sundae on the house, and we will keep the lighting up or down as you prefer.`,
  },
  {
    slug: 'sourcing-mutton-in-swabi',
    title: 'Where Our Mutton Comes From',
    category: 'Kitchen Notes',
    excerpt: 'One supplier, six years, and a standing rule that nothing frozen enters this kitchen.',
    cover: IMG.food.karahiClay,
    tags: ['sourcing', 'mutton', 'suppliers'],
    body: `We buy mutton from one house in Swabi and we have done for six years. It costs us more than shopping around and we have no intention of changing it.

## The rule

Nothing frozen. Everything arrives in the morning and is used the same day or the next. Anything not used by the end of the second service is not sold; it goes to staff meal or it goes out.

This is why we occasionally run out of the mutton dishes late on a Friday. We would rather tell you it is finished than serve you something that has sat.

## Why one supplier

A single relationship means the butcher knows exactly what we need and how we break it down. Chops come at a consistent thickness. Karahi cuts come bone-in at the right size. Roash meat comes from the right part of the animal.

You do not get that from whoever is cheapest this week.

## What we check

Every delivery is weighed and inspected on arrival, logged against the purchase order, and entered into the stock system before it goes into the cold room. If a batch is not right it goes back the same morning.

Boring, and completely necessary.`,
  },
  {
    slug: 'winter-menu-river-fish',
    title: 'Winter Is River Fish Season',
    category: 'Seasonal',
    excerpt: 'From November the karahi over the wood fire is mostly fish. Here is why you should order it.',
    cover: IMG.bbq.karahiFire,
    tags: ['fish', 'seasonal', 'winter'],
    body: `From late November until roughly March, the open karahi outside the kitchen door is mostly fish, and that is the time to order it.

## Why winter

River fish in this region is at its best in the cold months. The flesh is firmer, the fat content is higher, and it holds together in the batter instead of falling apart in the pan.

## How we do it

Whole fish, scored to the bone so the heat gets in, coated in a spiced gram-flour batter with ajwain and red chilli, and lowered into the wide karahi over a hardwood fire.

The wide pan matters. A deep fryer at a set temperature gives you an even, dull result. An open karahi over wood has hot and cool zones, and a cook who knows how to move the fish between them gets a crust that no fryer produces.

## How to eat it

With naan, lemon, and raw onion. Not with rice. Ask for the chutney.

## A note on bones

It is river fish. It has bones. We score it and we serve it whole because that is how it tastes best, and we would rather warn you than fillet it into something lesser.`,
  },
  {
    slug: 'catering-a-walima',
    title: 'What Catering a Walima Actually Involves',
    category: 'Guides',
    excerpt: 'Deghs, timings, staffing and the three decisions that matter most.',
    cover: IMG.food.pulaoTray,
    tags: ['catering', 'walima', 'events'],
    body: `We cater between eight and fifteen functions a month in Swabi district, most of them walimas and mehndis. The ones that go smoothly all get the same three things right.

## One: decide the count early

Everything scales off the guest count and everything has a lead time. A hundred and forty guests means roughly:

- Six deghs of Kabuli Pulao
- Four deghs of mutton karahi
- Twelve kilos of chapli kabab
- Six kilos of mixed BBQ
- Four hundred naan, baked on site

Tell us seven days ahead and none of this is difficult. Tell us the day before and some of it is impossible.

## Two: decide the serving time, then subtract

Pulao holds well for about ninety minutes in a covered degh. BBQ holds for twenty. If your serving time slips, the pulao is fine and the BBQ is not.

We build the schedule backwards from the time you tell us, so the accuracy of that time matters more than anything else on the order.

## Three: decide who is serving

Above two hundred guests we send our own service staff and chafing dishes as part of the package. Below that, most families use their own. Either works, but decide it early, because it changes how the food is packed and delivered.

## What we need from you

A confirmed count seven days out, a venue address with a phone number for someone who will actually be there, and fifty percent in advance. Everything else is our problem.`,
  },
  {
    slug: 'reading-a-karahi',
    title: 'How to Tell if a Karahi Is Finished',
    category: 'Kitchen Notes',
    excerpt: 'One visual cue tells you everything. Most kitchens serve five minutes before it appears.',
    cover: IMG.food.karahi,
    tags: ['karahi', 'technique'],
    body: `There is exactly one reliable test for a finished karahi and it is visual: the oil comes up clear and separates at the edge of the pan.

## What the separation means

While there is water left in the tomato and the meat, the fat stays emulsified into the sauce and the whole thing looks uniform and slightly dull. As the water cooks off, the emulsion breaks and the fat rises, clear and glossy, and pools at the edges.

That break is the moment the dish changes from stewed to fried. It is where karahi flavour comes from.

## Why most kitchens miss it

Because it happens late, and because the dish looks perfectly acceptable five minutes earlier. Under pressure, an acceptable-looking karahi goes to the pass.

We hold ours. This is occasionally why your karahi takes thirty-two minutes and not twenty-five.

## What you should look for

When it arrives, tilt the pan slightly. If a clear rim of oil runs at the edge and the masala clings to the meat rather than pooling under it, it is right.

If the sauce is thin and the oil is mixed through, it went out early. Send it back. Any kitchen worth eating in will take it.`,
  },
];

const blogs = BLOG_SEED.map((b, i) => ({
  id: String(i + 1),
  slug: b.slug,
  title: b.title,
  excerpt: b.excerpt,
  body: b.body,
  coverImage: b.cover,
  authorName: i % 3 === 0 ? 'Gulzar Ahmad' : i % 3 === 1 ? 'Rashid Ali Khan' : 'Fazal Rabi',
  authorTitle: i % 3 === 0 ? 'Head Chef' : i % 3 === 1 ? 'Restaurant Manager' : 'Grill Master',
  authorAvatar: null,
  category: b.category,
  tags: b.tags,
  readMinutes: Math.max(3, Math.round(b.body.split(/\s+/).length / 210)),
  publishedAt: daysAgo(12 * (BLOG_SEED.length - i)),
  isPublished: true,
  isFeatured: i < 3,
  seoTitle: `${b.title} | Salateen Restaurant Swabi`,
  seoDescription: b.excerpt,
  createdAt: daysAgo(12 * (BLOG_SEED.length - i) + 2),
}));

const FAQ_SEED = [
  ['Ordering', 'Do you deliver, and where?', 'Yes. We deliver across Swabi city, Mal Lar, the Jhangira Road corridor, Yar Hussain, Topi, Kalu Khan, Panjpir, Zaida, Marghuz and Shewa Adda. Delivery charges range from Rs 60 to Rs 200 by area, and delivery is free anywhere inside Swabi city on orders above Rs 2,500.'],
  ['Ordering', 'What payment methods do you accept?', 'Cash only. For delivery orders you pay the rider in cash when the food arrives. For dine-in you pay at the counter. We do not currently accept cards or online payment, and we never ask for payment details online.'],
  ['Ordering', 'Is there a minimum order for delivery?', 'Yes, and it varies by area, from Rs 1,500 in Mal Lar up to Rs 3,200 for the furthest zones. The minimum for your address is shown at checkout as soon as you pick a delivery area.'],
  ['Ordering', 'How long does delivery take?', 'Between twenty and fifty-five minutes depending on your area and how busy the kitchen is. The estimate shown at checkout is the one we work to. On Friday evenings, add fifteen minutes.'],
  ['Ordering', 'Can I order the Grand Platter for delivery?', 'Yes, though we recommend calling 0312-0991116 forty minutes ahead. It is a large tray and it travels best when it goes out the moment it is finished.'],
  ['Menu', 'What is your most popular dish?', 'Kabuli Pulao, without much competition. After that, the Chapli Kabab, the Chicken Karahi and the Beef Seekh Kabab.'],
  ['Menu', 'Do you have vegetarian options?', 'Yes. Mix Sabzi and Daal Mash are fully vegetarian, and the breads, salads, raita, desserts and drinks are as well. Everything is cooked in a shared kitchen, so please tell us if you need it kept strictly separate.'],
  ['Menu', 'Is all your food halal?', 'Yes, everything we serve is halal without exception. Meat comes from a single Swabi supplier we have worked with for six years.'],
  ['Menu', 'Do you have anything mild enough for children?', 'Yes. Chicken White Karahi and Chicken White Handi contain no chilli at all. Chicken Pulao and Chicken Fried Rice are also mild, and the kitchen will make almost anything without green chilli if you ask.'],
  ['Menu', 'How does half-kilo and full-kilo pricing work?', 'Most karahis, handis and kababs are priced by weight of the cooked dish, exactly as on our printed menu card. A half kilo comfortably serves two, a full kilo serves four alongside rice and bread.'],
  ['Reservations', 'Do I need to book a table?', 'Not on a weekday. On Friday and Saturday evenings, and for any group over eight, we strongly recommend it. Booking is free and takes a minute on the reservation page.'],
  ['Reservations', 'Can I book the family hall?', 'Yes. Individual family-hall tables can be booked online. For the whole hall, which takes up to forty, call 0312-0991116 at least three days ahead.'],
  ['Reservations', 'How far ahead can I book?', 'Up to sixty days. Bookings need at least two hours notice so the kitchen and floor can plan.'],
  ['Reservations', 'What happens after I submit a reservation?', 'It arrives as pending and the manager confirms it, usually within an hour during opening times. You will see the status on the reservation confirmation page and in your account.'],
  ['Reservations', 'Is there a charge to cancel?', 'No. Cancel any time from your account or by phone. We only ask that you tell us, so the table can go to someone else.'],
  ['Visiting', 'What are your opening hours?', 'Ten in the morning until midnight, every day of the year including Eid.'],
  ['Visiting', 'Is there parking?', 'Yes, free of charge. There is a parking lot for around thirty cars plus free street parking on Jhangira Road.'],
  ['Visiting', 'Is the restaurant accessible?', 'Yes. The entrance, the main hall seating, the toilets and the car park are all wheelchair accessible. Tell us when booking and we will hold a table with easy access.'],
  ['Visiting', 'Do you have outdoor seating?', 'Yes, on the lawn beside the grill pits, plus marquee seating in winter. Ask for the outdoor zone when you book.'],
  ['Catering', 'Do you cater weddings and functions?', 'Yes, from a hundred guests upwards, anywhere in Swabi district. We supply deghs, and above two hundred guests we send serving staff and chafing dishes as part of the package. Book at least seven days ahead with fifty percent in advance.'],
  ['Catering', 'Can you cook a whole goat or lamb?', 'Yes, with three days notice. We take the order, source the animal and cook it whole, and this is a common request for functions.'],
  ['General', 'Do you have a kids menu?', 'Yes, and children are genuinely welcome. High chairs are available on request.'],
  ['General', 'Can I get a receipt or invoice for a company lunch?', 'Yes. Ask at the counter and the cashier will print one with your company name on it.'],
  ['General', 'Are you hiring?', 'Usually. Current openings are listed on the careers page, and you can always drop a CV at the counter.'],
];
const faq = FAQ_SEED.map(([category, question, answer], i) => ({
  id: String(i + 1),
  question,
  answer,
  category,
  sortOrder: i + 1,
  isPublished: true,
  createdAt: daysAgo(int(60, 500)),
}));

const CONTACT_SUBJECTS = [
  ['catering', 'Catering enquiry for a walima on the 22nd', 'We are expecting around 180 guests at a hall in Swabi city. Could you send a quote for Kabuli Pulao, mutton karahi and mixed BBQ, with serving staff?'],
  ['general', 'Do you have parking for a coach?', 'We are bringing a college group of about forty from Topi. Is there room for a coach in your car park?'],
  ['feedback', 'The chapli kabab was excellent', 'Just wanted to say the chapli kabab last night was the best I have had outside Peshawar. Please pass it on to the kitchen.'],
  ['complaint', 'Delivery arrived late on Friday', 'Order SLT-24488 arrived nearly an hour after the estimate. Food was still hot but the estimate should be more honest on a Friday.'],
  ['careers', 'Application for kitchen position', 'I have four years experience on the tandoor in Mardan and am looking for work in Swabi. Attaching my details.'],
  ['catering', 'Whole goat for Eid', 'Can you cook a whole goat for a family function on the second day of Eid? What notice do you need?'],
  ['general', 'Family hall booking for 35', 'Looking to book the family hall for a mehndi reception of around 35 people. Is it available on a Saturday?'],
  ['feedback', 'Green tea and hospitality', 'Small thing, but the staff kept the green tea coming for two hours without us asking once. That is why we keep coming back.'],
  ['partnership', 'Supply proposal - fresh produce', 'We supply vegetables to several restaurants in Mardan and would like to discuss supplying Salateen.'],
  ['complaint', 'Wrong item in delivery', 'We ordered white handi and received green handi. Not a disaster but the children could not eat it.'],
  ['general', 'Do you open on Eid day?', 'Planning a family lunch and wanted to check whether you are open on the first day of Eid.'],
  ['careers', 'Delivery rider position', 'I have my own motorcycle and know Swabi and the surrounding villages well. Are you taking riders?'],
  ['feedback', 'Kabuli Pulao is worth the drive', 'We drove from Nowshera on a recommendation and it lived up to it completely. Will be back.'],
  ['catering', 'Corporate lunch for 60', 'Our office in Topi needs lunch delivered for around 60 people once a month. Can you quote a per-head rate?'],
];
const contactMessages = CONTACT_SUBJECTS.map(([topic, subject, message], i) => {
  const name = pick(ALL_NAMES);
  const status = i < 3 ? 'new' : i < 7 ? 'read' : chance(0.6) ? 'replied' : 'archived';
  return {
    id: String(i + 1),
    name,
    email: emailFor(name, i + 300),
    phone: phoneFor(i + 600),
    subject,
    message,
    topic,
    status,
    reply: status === 'replied' ? 'Thank you for getting in touch. One of our team will call you on the number provided to confirm the details.' : undefined,
    repliedAt: status === 'replied' ? daysAgo(int(1, 20)) : undefined,
    createdAt: daysAgo(int(0, 40), int(0, 12)),
  };
});

const events = [
  {
    slug: 'friday-charcoal-night',
    title: 'Friday Charcoal Night',
    description: 'Every Friday from seven, the pits run at full capacity and the whole BBQ section is served family style on shared trays. Live tandoor, unlimited sabz chai and the lawn open until midnight.',
    image: IMG.bbq.seekh,
    venue: 'Lawn & Main Hall',
    capacity: 180,
    pricePerHead: 1400,
    highlights: ['Unlimited sabz chai', 'Live tandoor', 'Shared-tray service', 'Lawn seating until midnight'],
    offsetDays: 3,
  },
  {
    slug: 'eid-family-buffet',
    title: 'Eid Family Buffet',
    description: 'Three days of Eid, three services a day. Kabuli Pulao, mutton karahi, chapli kabab, BBQ, four salans and dessert, laid out in the family hall and the main hall.',
    image: IMG.food.feast,
    venue: 'Family Hall & Main Hall',
    capacity: 240,
    pricePerHead: 1900,
    highlights: ['Three services daily', 'Full family hall with purdah', 'Children under six eat free', 'Advance booking recommended'],
    offsetDays: 34,
  },
  {
    slug: 'winter-fish-festival',
    title: 'Winter River Fish Festival',
    description: 'Four weeks from mid-December, the open karahi runs fish all evening. Whole river fish fried to order, with naan, chutney and raw onion.',
    image: IMG.bbq.karahiFire,
    venue: 'Outdoor Karahi Station',
    capacity: 120,
    pricePerHead: null,
    highlights: ['Whole fish fried to order', 'Open wood fire', 'Winter marquee seating', 'A la carte pricing'],
    offsetDays: 128,
  },
  {
    slug: 'graduation-season-platters',
    title: 'Graduation Season Platters',
    description: 'Through July and August we hold the family hall for graduation parties. Grand Platter pricing for groups, cake stand and photographs arranged on request.',
    image: IMG.food.grand,
    venue: 'Family Hall',
    capacity: 60,
    pricePerHead: 900,
    highlights: ['Grand Platter group pricing', 'Cake stand provided', 'Private partitioned seating', 'Booking essential'],
    offsetDays: -4,
  },
  {
    slug: 'chefs-table-kabuli',
    title: "Chef's Table: Kabuli Pulao",
    description: 'Twelve seats around the pass while Gulzar Ahmad builds a degh of Kabuli Pulao from the stock up. Two hours, tasting throughout, questions encouraged.',
    image: IMG.food.kabuli,
    venue: 'Kitchen Pass',
    capacity: 12,
    pricePerHead: 2500,
    highlights: ['Twelve seats only', 'Two hours with the head chef', 'Full tasting included', 'Monthly'],
    offsetDays: 17,
  },
  {
    slug: 'ramadan-iftar-service',
    title: 'Ramadan Iftar Service',
    description: 'Iftar laid out across all three halls throughout Ramadan, with dates, fruit chaat, pakora, the full menu after Maghrib and sehri service until 4am.',
    image: IMG.int.banquet,
    venue: 'All Halls',
    capacity: 300,
    pricePerHead: 1200,
    highlights: ['Iftar and sehri service', 'All three halls open', 'Group bookings welcome', 'Prayer space available'],
    offsetDays: 215,
  },
].map((e, i) => ({
  id: String(i + 1),
  slug: e.slug,
  title: e.title,
  description: e.description,
  image: e.image,
  startsAt: daysAhead(e.offsetDays),
  endsAt: daysAhead(e.offsetDays + (e.slug === 'winter-fish-festival' ? 28 : e.slug === 'ramadan-iftar-service' ? 30 : 0)),
  venue: e.venue,
  capacity: e.capacity,
  pricePerHead: e.pricePerHead,
  highlights: e.highlights,
  isPublished: true,
  createdAt: daysAgo(int(20, 200)),
}));

const cateringPackages = [
  {
    slug: 'majlis-package',
    name: 'Majlis',
    tagline: 'The everyday gathering',
    description: 'Our entry package for family functions and small receptions. Kabuli Pulao, one karahi, chapli kabab, salad, raita and naan, delivered hot in covered deghs.',
    image: IMG.food.pulaoTray,
    pricePerHead: 850,
    minGuests: 50,
    courses: ['Kabuli Pulao', 'Chicken Karahi', 'Chapli Kabab', 'Salad & Raita', 'Naan'],
    includes: ['Covered deghs', 'Delivery within Swabi district', 'Disposable plates and cutlery'],
    isPopular: false,
  },
  {
    slug: 'shahi-package',
    name: 'Shahi',
    tagline: 'The one most families choose',
    description: 'Two rice dishes, two karahis, full BBQ selection, two salans and dessert. Serving staff included above 200 guests.',
    image: IMG.food.feast,
    pricePerHead: 1450,
    minGuests: 100,
    courses: ['Kabuli Pulao', 'Chicken Pulao', 'Mutton Karahi', 'Chicken White Karahi', 'Mixed BBQ', 'Daal Mash', 'Mix Sabzi', 'Kheer'],
    includes: ['Covered deghs and chafing dishes', 'Serving staff above 200 guests', 'On-site tandoor for fresh naan', 'Delivery and setup'],
    isPopular: true,
  },
  {
    slug: 'salateen-royale',
    name: 'Salateen Royale',
    tagline: 'Walima scale, no compromises',
    description: 'The full kitchen at your venue. Whole roast goat, three rice dishes, four karahis, the entire BBQ section, four salans, three desserts and a live tandoor.',
    image: IMG.food.grand,
    pricePerHead: 2400,
    minGuests: 200,
    courses: ['Whole Roast Goat', 'Kabuli Pulao', 'Mutton Pulao', 'Chicken Pulao', 'Mutton Karahi', 'Mutton Shinwari', 'Chicken Handi', 'Beef Karahi', 'Full BBQ Selection', 'Four Salans', 'Kheer, Kulfa & Fruit'],
    includes: ['Full serving team', 'Chafing dishes and covered deghs', 'Live tandoor and live BBQ station', 'Setup, service and clearing', 'Dedicated event manager'],
    isPopular: false,
  },
  {
    slug: 'corporate-lunch',
    name: 'Corporate Lunch',
    tagline: 'Office catering, on time',
    description: 'Individually packed lunches or a shared buffet for offices and institutions, delivered at a fixed time every day or on a schedule.',
    image: IMG.food.kabuli,
    pricePerHead: 620,
    minGuests: 25,
    courses: ['Choice of Pulao or Rice', 'One Karahi or Handi', 'Salad', 'Naan', 'Soft Drink'],
    includes: ['Individually packed or buffet', 'Fixed daily delivery slot', 'Monthly invoicing available'],
    isPopular: false,
  },
  {
    slug: 'aqiqa-and-small-functions',
    name: 'Aqiqa & Small Functions',
    tagline: 'Under fifty guests',
    description: 'A compact package for aqiqas, birthdays and small gatherings, either at your home or in our family hall.',
    image: IMG.int.family,
    pricePerHead: 950,
    minGuests: 20,
    courses: ['Kabuli Pulao', 'Chicken Karahi', 'Seekh Kabab', 'Salad & Raita', 'Naan', 'Kheer'],
    includes: ['Family hall option at no extra cost', 'Cake stand provided', 'Covered deghs for home delivery'],
    isPopular: true,
  },
].map((c, i) => ({ id: String(i + 1), ...c, isActive: true, createdAt: daysAgo(int(100, 600)) }));

const jobs = [
  {
    slug: 'grill-chef-charcoal',
    title: 'Grill Chef (Charcoal Section)',
    department: 'Kitchen',
    type: 'full-time',
    experience: '3+ years on charcoal',
    salaryRange: 'Rs 45,000 - Rs 70,000 per month',
    description: 'Work the charcoal pits alongside our grill master. Responsible for marination, coal management and every skewer that leaves the section.',
    responsibilities: ['Prepare and manage the coal bed from 16:00', 'Marinate and portion BBQ items to spec', 'Turn and finish all skewers to order', 'Maintain section hygiene and close down the pits'],
    requirements: ['Minimum 3 years on a charcoal grill', 'Able to work evening and late shifts', 'Understands marination timing for beef, chicken and mutton', 'Food handling certificate preferred'],
  },
  {
    slug: 'tandoor-baker',
    title: 'Tandoor Baker',
    department: 'Kitchen',
    type: 'full-time',
    experience: '2+ years',
    salaryRange: 'Rs 38,000 - Rs 55,000 per month',
    description: 'Run the tandoor through service. Naan, roghni and kulcha, pulled to order and out in under two minutes.',
    responsibilities: ['Prepare and prove dough daily', 'Bake to order through service', 'Maintain tandoor temperature and cleanliness'],
    requirements: ['2+ years tandoor experience', 'Consistent output under pressure', 'Available for split shifts'],
  },
  {
    slug: 'floor-supervisor',
    title: 'Floor Supervisor',
    department: 'Service',
    type: 'full-time',
    experience: '3+ years in hospitality',
    salaryRange: 'Rs 50,000 - Rs 75,000 per month',
    description: 'Run the floor across the main hall, family hall and lawn. Manage the waiter team, reservations and guest recovery.',
    responsibilities: ['Manage seating and reservations through service', 'Supervise and roster the waiting team', 'Handle guest complaints on the spot', 'Coordinate with the kitchen pass'],
    requirements: ['3+ years hospitality experience, at least 1 supervising', 'Fluent Pashto and Urdu, working English', 'Calm under a full house'],
  },
  {
    slug: 'delivery-rider',
    title: 'Delivery Rider',
    department: 'Delivery',
    type: 'full-time',
    experience: 'Valid licence required',
    salaryRange: 'Rs 32,000 per month plus fuel and tips',
    description: 'Deliver across Swabi city and the surrounding zones. Own motorcycle preferred, fuel allowance provided.',
    responsibilities: ['Deliver orders within the estimated time', 'Collect cash and reconcile at end of shift', 'Keep the delivery box clean and food safe'],
    requirements: ['Valid driving licence', 'Own motorcycle preferred', 'Knows Swabi and surrounding villages', 'Available evenings and weekends'],
  },
  {
    slug: 'cashier-accounts',
    title: 'Cashier & Accounts Assistant',
    department: 'Management',
    type: 'full-time',
    experience: '2+ years',
    salaryRange: 'Rs 42,000 - Rs 58,000 per month',
    description: 'Handle the counter, daily reconciliation and supplier payments.',
    responsibilities: ['Operate the counter through service', 'Reconcile cash daily against the system', 'Process supplier invoices and payments', 'Maintain purchase records'],
    requirements: ['2+ years in a cash-handling role', 'Comfortable with spreadsheets and POS software', 'Accurate under pressure'],
  },
  {
    slug: 'kitchen-porter',
    title: 'Kitchen Porter',
    department: 'Kitchen',
    type: 'part-time',
    experience: 'No experience required',
    salaryRange: 'Rs 24,000 per month',
    description: 'Support the kitchen with prep, washing and stock movement. Training provided, and a genuine route into a chef role.',
    responsibilities: ['Wash and maintain kitchen equipment', 'Basic vegetable and meat prep', 'Move stock between store and kitchen'],
    requirements: ['Willing to learn', 'Physically able for a busy kitchen', 'Available evenings'],
  },
].map((j, i) => ({
  id: String(i + 1),
  ...j,
  location: 'Jhangira Road, Mal Lar, Swabi',
  isOpen: i !== 5,
  createdAt: daysAgo(int(5, 120)),
}));

const branches = [
  {
    slug: 'swabi-jhangira-road',
    name: 'Salateen Swabi (Flagship)',
    city: 'Swabi',
    address: 'Jhangira Road, Mal Lar, Swabi, Khyber Pakhtunkhwa',
    phone: '0312-0991116',
    image: IMG.ext.day,
    status: 'open',
    mapUrl: 'https://maps.google.com/?q=Salateen+Restaurant+Swabi',
  },
  {
    slug: 'mardan-bank-road',
    name: 'Salateen Mardan',
    city: 'Mardan',
    address: 'Bank Road, Mardan, Khyber Pakhtunkhwa',
    phone: '0312-0991116',
    image: IMG.ext.neon,
    status: 'coming-soon',
    openingDate: 'Spring 2027',
    mapUrl: 'https://maps.google.com/?q=Bank+Road+Mardan',
  },
  {
    slug: 'topi-gik-road',
    name: 'Salateen Topi',
    city: 'Topi',
    address: 'GIK Road, Topi, Swabi District, Khyber Pakhtunkhwa',
    phone: '0312-0991116',
    image: IMG.ext.terrace,
    status: 'coming-soon',
    openingDate: 'Late 2027',
    mapUrl: 'https://maps.google.com/?q=Topi+Swabi',
  },
].map((b, i) => ({ id: String(i + 1), ...b, createdAt: daysAgo(int(200, 1600)) }));

/* ------------------------------------------------- 9. Ops notifications */

const notifications = [];
const recentOrders = orders.slice(0, 10);
recentOrders.forEach((o, i) => {
  notifications.push({
    id: String(notifications.length + 1),
    userId: null,
    kind: 'order',
    title: `New order ${o.reference}`,
    body: `${o.customerName} placed a ${o.fulfilment === 'delivery' ? 'delivery' : 'dine-in'} order for Rs ${o.grandTotal.toLocaleString('en-PK')}.`,
    link: `/admin/orders/${o.id}`,
    isRead: i > 3,
    severity: 'info',
    createdAt: o.createdAt,
  });
});
reservations
  .filter((r) => r.status === 'pending')
  .slice(0, 5)
  .forEach((r) => {
    notifications.push({
      id: String(notifications.length + 1),
      userId: null,
      kind: 'reservation',
      title: `Reservation request ${r.reference}`,
      body: `${r.customerName} requested ${r.guests} guests in the ${r.zone.replace('-', ' ')} on ${r.date} at ${r.time}.`,
      link: `/admin/reservations/${r.id}`,
      isRead: false,
      severity: 'warning',
      createdAt: r.createdAt,
    });
  });
inventory
  .filter((it) => it.quantity <= it.reorderLevel)
  .slice(0, 8)
  .forEach((it) => {
    notifications.push({
      id: String(notifications.length + 1),
      userId: null,
      kind: 'inventory',
      title: `Low stock: ${it.name}`,
      body: `${it.quantity} ${it.unit} remaining, below the reorder level of ${it.reorderLevel} ${it.unit}.`,
      link: `/admin/inventory`,
      isRead: false,
      severity: it.quantity <= it.reorderLevel / 2 ? 'danger' : 'warning',
      createdAt: daysAgo(int(0, 3), int(0, 12)),
    });
  });
reviews.slice(0, 5).forEach((r) => {
  notifications.push({
    id: String(notifications.length + 1),
    userId: null,
    kind: 'review',
    title: `New ${r.rating}-star review`,
    body: `${r.customerName}: "${r.title}"`,
    link: '/admin/reviews',
    isRead: chance(0.5),
    severity: r.rating >= 4 ? 'success' : 'warning',
    createdAt: r.createdAt,
  });
});
notifications.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
notifications.forEach((n, i) => (n.id = String(i + 1)));

const LOG_ACTIONS = [
  ['info', 'order.status.updated', 'Order'],
  ['info', 'reservation.confirmed', 'Reservation'],
  ['info', 'menu.item.updated', 'Menu item'],
  ['info', 'inventory.restocked', 'Inventory item'],
  ['warning', 'inventory.low_stock', 'Inventory item'],
  ['info', 'user.login', 'User'],
  ['warning', 'user.login_failed', 'User'],
  ['info', 'coupon.applied', 'Coupon'],
  ['error', 'order.cancelled', 'Order'],
  ['info', 'settings.updated', 'Settings'],
];
const systemLogs = Array.from({ length: 60 }, (_, i) => {
  const [level, action, targetKind] = pick(LOG_ACTIONS);
  return {
    id: String(i + 1),
    level,
    actor: pick(['Sardar Salateen Khan', 'Rashid Ali Khan', 'Gulzar Ahmad', 'Noor Muhammad', 'system']),
    action,
    target: `${targetKind} #${int(1, 240)}`,
    ip: `39.${int(32, 63)}.${int(0, 255)}.${int(1, 254)}`,
    meta: { userAgent: 'Mozilla/5.0', channel: pick(['admin', 'web', 'api']) },
    createdAt: daysAgo(int(0, 30), int(0, 23)),
  };
}).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
systemLogs.forEach((l, i) => (l.id = String(i + 1)));

/* --------------------------------------------------- 10. Analytics rollups */

const todayIso = NOW.toISOString().slice(0, 10);
const isSameDay = (isoStr, dayIso) => isoStr.slice(0, 10) === dayIso;
const todayOrders = orders.filter((o) => isSameDay(o.createdAt, todayIso) && o.status !== 'cancelled');
const yesterdayOrders = orders.filter((o) => isSameDay(o.createdAt, dateOnly(-1)) && o.status !== 'cancelled');
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const pctDelta = (a, b) => (b === 0 ? 0 : Math.round(((a - b) / b) * 1000) / 10);

const todayRevenue = sum(todayOrders, (o) => o.grandTotal);
const yesterdayRevenue = sum(yesterdayOrders, (o) => o.grandTotal);
const todayReservations = reservations.filter((r) => r.date === todayIso);

const dashboardStats = {
  id: '1',
  todayOrders: todayOrders.length,
  todayRevenue,
  todayReservations: todayReservations.length,
  todayCovers: sum(todayReservations, (r) => r.guests),
  pendingOrders: orders.filter((o) => o.status === 'pending').length,
  activeKitchenTickets: orders.filter((o) => ['accepted', 'preparing'].includes(o.status)).length,
  averageOrderValue: todayOrders.length ? Math.round(todayRevenue / todayOrders.length) : 0,
  averagePrepMinutes: 32,
  lowStockCount: inventory.filter((i) => i.quantity <= i.reorderLevel).length,
  newCustomers: customers.filter((c) => new Date(c.createdAt) > new Date(NOW.getTime() - 7 * 864e5)).length,
  ordersDelta: pctDelta(todayOrders.length, yesterdayOrders.length),
  revenueDelta: pctDelta(todayRevenue, yesterdayRevenue),
  reservationsDelta: pctDelta(todayReservations.length, reservations.filter((r) => r.date === dateOnly(-1)).length),
  customersDelta: 12.4,
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const revenueWeek = DAY_LABELS.map((label, i) => ({
  label,
  value: round(sum(orders.filter((o) => isSameDay(o.createdAt, dateOnly(i - 6))), (o) => o.grandTotal) || int(38000, 96000), 100),
}));
const revenueMonth = Array.from({ length: 30 }, (_, i) => ({
  label: String(new Date(NOW.getTime() - (29 - i) * 864e5).getDate()),
  value: round(sum(orders.filter((o) => isSameDay(o.createdAt, dateOnly(i - 29))), (o) => o.grandTotal) || int(32000, 105000), 100),
}));
const revenueYear = MONTH_LABELS.map((label, i) => ({
  label,
  // Ramadan/Eid and winter wedding season visibly lift the curve.
  value: round(1_450_000 + Math.sin((i / 12) * Math.PI * 2) * 260_000 + (i === 2 || i === 10 ? 340_000 : 0) + int(-90_000, 90_000), 1000),
}));

const soldTally = new Map();
for (const o of orders) {
  if (o.status === 'cancelled') continue;
  for (const line of o.items) {
    const prev = soldTally.get(line.menuItemId) ?? { qty: 0, revenue: 0 };
    soldTally.set(line.menuItemId, { qty: prev.qty + line.quantity, revenue: prev.revenue + line.lineTotal });
  }
}
const topSelling = [...soldTally.entries()]
  .map(([menuItemId, v]) => {
    const item = menuById[menuItemId];
    return {
      menuItemId,
      name: item.name,
      image: item.image,
      quantitySold: v.qty,
      revenue: v.revenue,
      categoryName: categories.find((c) => c.id === item.categoryId).name,
    };
  })
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 10);

const catTally = new Map();
for (const [menuItemId, v] of soldTally) {
  const cid = menuById[menuItemId].categoryId;
  const prev = catTally.get(cid) ?? { orders: 0, revenue: 0 };
  catTally.set(cid, { orders: prev.orders + v.qty, revenue: prev.revenue + v.revenue });
}
const catTotalRevenue = [...catTally.values()].reduce((s, v) => s + v.revenue, 0);
const categoryShare = [...catTally.entries()]
  .map(([categoryId, v]) => ({
    categoryId,
    name: categories.find((c) => c.id === categoryId).name,
    orders: v.orders,
    revenue: v.revenue,
    sharePercent: Math.round((v.revenue / catTotalRevenue) * 1000) / 10,
  }))
  .sort((a, b) => b.revenue - a.revenue);

const customerGrowth = MONTH_LABELS.slice(0, 12).map((month, i) => ({
  month,
  newCustomers: 40 + Math.round(Math.sin(i / 2) * 14) + int(0, 22),
  returningCustomers: 120 + i * 9 + int(0, 30),
}));

const hourlyLoad = Array.from({ length: 15 }, (_, i) => {
  const hour = 10 + i;
  // Two peaks: lunch around 13:00 and a much larger dinner peak around 20:00.
  const lunch = Math.exp(-Math.pow(hour - 13.2, 2) / 3) * 26;
  const dinner = Math.exp(-Math.pow(hour - 20.3, 2) / 4.5) * 62;
  return { hour: `${String(hour % 24).padStart(2, '0')}:00`, orders: Math.round(lunch + dinner + int(0, 6)) };
});

const deliveryCount = orders.filter((o) => o.fulfilment === 'delivery').length;
const analytics = {
  id: '1',
  date: todayIso,
  revenueWeek,
  revenueMonth,
  revenueYear,
  topSelling,
  categoryShare,
  customerGrowth,
  hourlyLoad,
  fulfilmentSplit: [
    { label: 'Delivery', value: deliveryCount },
    { label: 'Dine-in', value: orders.length - deliveryCount },
  ],
};

/* ------------------------------------------------------------- 11. Write */

const db = {
  restaurant: RESTAURANT,
  settings: SETTINGS,
  categories,
  menu,
  menuImages,
  banners,
  offers,
  chefs,
  reservations,
  orders,
  customers,
  deliveryAreas,
  inventory,
  inventoryLogs,
  suppliers,
  staff,
  users,
  roles,
  permissions,
  testimonials,
  gallery,
  blogs,
  faq,
  coupons,
  contactMessages,
  notifications,
  reviews,
  tables,
  events,
  cateringPackages,
  jobs,
  branches,
  systemLogs,
  dashboardStats,
  analytics,
};

const out = path.join(ROOT, 'db.json');
fs.writeFileSync(out, JSON.stringify(db, null, 2) + '\n');

const counts = Object.entries(db)
  .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : 1}`)
  .join('\n  ');
console.log(`db.json written to ${out}\n  ${counts}`);
console.log(`\nTotal size: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
