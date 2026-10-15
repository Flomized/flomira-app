import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  ProductFlavor,
  ProductSize,
  WebsiteProduct,
  ScrollSection,
  BusinessSettings,
  OrderFormData
} from '@/types/website';

const WEBSITE_ID = 'default';

type FirestoreRecord = Record<string, unknown>;

function record(value: unknown): FirestoreRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as FirestoreRecord
    : {};
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function integer(value: unknown, fallback: number): number {
  const parsed = finiteNumber(value);
  return parsed !== null && Number.isSafeInteger(parsed) ? parsed : fallback;
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function isoDate(value: unknown): string {
  let candidate: unknown = value;

  if (candidate && typeof candidate === 'object') {
    const firestoreTimestamp = candidate as { toDate?: () => Date; seconds?: number };
    if (typeof firestoreTimestamp.toDate === 'function') {
      candidate = firestoreTimestamp.toDate();
    } else if (typeof firestoreTimestamp.seconds === 'number') {
      candidate = firestoreTimestamp.seconds * 1000;
    }
  }

  const date = candidate instanceof Date
    ? candidate
    : typeof candidate === 'number' || typeof candidate === 'string'
      ? new Date(candidate)
      : null;

  return date && Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date(0).toISOString();
}

function slugPart(value: string): string {
  return value.toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'size';
}

function normalizeFlavor(value: unknown): ProductFlavor | null {
  if (typeof value === 'string') {
    const name = value.trim();
    return name ? { name, description: '' } : null;
  }

  const input = record(value);
  const name = text(input.name);
  return name ? { name, description: text(input.description) } : null;
}

function normalizeSize(value: unknown, index: number, productId: string): ProductSize | null {
  const input = record(value);
  // `name`/`price` are accepted only as a read fallback for documents written
  // before the Flutter website model became the source of truth.
  const label = text(input.label) || text(input.name);
  const basePrice = finiteNumber(input.basePrice) ?? finiteNumber(input.price);
  if (!label || basePrice === null || basePrice < 0) return null;

  const rawId = text(input.id);
  return {
    id: rawId || `${productId}-size-${slugPart(label)}-${index + 1}`,
    label,
    servings: Math.max(0, integer(input.servings, 0)),
    basePrice,
  };
}

/**
 * Converts either a Flutter WebsiteProduct document or the older web shape to
 * one canonical product used by every web surface.
 */
export function normalizeWebsiteProduct(value: unknown, documentId?: string): WebsiteProduct | null {
  const input = record(value);
  const id = text(documentId) || text(input.id);
  const name = text(input.name);
  if (!id || !name) return null;

  const rawImages = Array.isArray(input.images) ? input.images : [];
  const imageUrl = text(input.imageUrl) || text(rawImages.find((item) => typeof item === 'string'));
  const flavors = (Array.isArray(input.flavors) ? input.flavors : [])
    .map(normalizeFlavor)
    .filter((flavor): flavor is ProductFlavor => flavor !== null);
  const sizes = (Array.isArray(input.sizes) ? input.sizes : [])
    .map((size, index) => normalizeSize(size, index, id))
    .filter((size): size is ProductSize => size !== null);
  const fallbackSlug = text(input.slug) || slugPart(name);

  return {
    id,
    slug: fallbackSlug,
    name,
    category: text(input.category) || 'Uncategorized',
    description: text(input.description),
    imageUrl,
    imageAlt: text(input.imageAlt) || name,
    flavors,
    sizes,
    allergens: (Array.isArray(input.allergens) ? input.allergens : [])
      .filter((allergen): allergen is string => typeof allergen === 'string')
      .map((allergen) => allergen.trim())
      .filter(Boolean),
    leadTimeDays: Math.max(0, integer(input.leadTimeDays, 0)),
    featured: boolean(input.featured, false),
    visible: boolean(input.visible, true),
    createdAt: isoDate(input.createdAt),
    updatedAt: isoDate(input.updatedAt),
    createdBy: text(input.createdBy),
  };
}

function normalizeProductDocument(document: { id: string; data(): FirestoreRecord }): WebsiteProduct | null {
  return normalizeWebsiteProduct(document.data(), document.id);
}

// ============================================================================
// PRODUCTS
// ============================================================================

export async function getProducts(): Promise<WebsiteProduct[]> {
  const productsRef = collection(db, `websites/${WEBSITE_ID}/products`);
  const q = query(productsRef, where('visible', '==', true));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(normalizeProductDocument)
    .filter((product): product is WebsiteProduct => product !== null);
}

export async function getProductBySlug(slug: string): Promise<WebsiteProduct | null> {
  const productsRef = collection(db, `websites/${WEBSITE_ID}/products`);
  const q = query(productsRef, where('slug', '==', slug), where('visible', '==', true));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return normalizeProductDocument(snapshot.docs[0])
    ?? null;
}

export async function getFeaturedProducts(): Promise<WebsiteProduct[]> {
  const productsRef = collection(db, `websites/${WEBSITE_ID}/products`);
  const q = query(
    productsRef,
    where('featured', '==', true),
    where('visible', '==', true)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(normalizeProductDocument)
    .filter((product): product is WebsiteProduct => product !== null);
}

// ============================================================================
// SCROLL SECTIONS
// ============================================================================

export async function getScrollSections(): Promise<ScrollSection[]> {
  const sectionsRef = collection(db, `websites/${WEBSITE_ID}/scrollSections`);
  const q = query(
    sectionsRef,
    where('visible', '==', true)
  );
  const snapshot = await getDocs(q);

  const sections = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as ScrollSection));

  // Sort by order in JavaScript to avoid needing a composite index
  return sections.sort((a, b) => a.order - b.order);
}

// ============================================================================
// BUSINESS SETTINGS
// ============================================================================

export async function getBusinessSettings(): Promise<BusinessSettings | null> {
  const settingsRef = doc(db, `websites/${WEBSITE_ID}/config/settings`);
  const snapshot = await getDoc(settingsRef);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as BusinessSettings;
}

// ============================================================================
// ORDERS
// ============================================================================

export async function submitOrder(formData: OrderFormData): Promise<string> {
  // Get product details
  const productsRef = collection(db, `websites/${WEBSITE_ID}/products`);
  const productDoc = await getDoc(doc(productsRef, formData.productId));

  if (!productDoc.exists()) {
    throw new Error('Product not found');
  }

  const product = normalizeWebsiteProduct(productDoc.data(), productDoc.id);
  if (!product) {
    throw new Error('Product data is invalid');
  }

  // Find selected size
  const selectedSize = product.sizes.find(s => s.label === formData.sizeName);
  if (!selectedSize) {
    throw new Error('Size not found');
  }

  if (product.flavors.length > 0 && !product.flavors.some((flavor) => flavor.name === formData.flavorName)) {
    throw new Error('Flavor not found');
  }

  // Get business settings for delivery fee
  const settings = await getBusinessSettings();
  if (!settings) {
    throw new Error('Business settings not found');
  }

  const deliveryArea = settings.deliveryAreas.find(a => a.name === formData.deliveryArea);
  if (!deliveryArea) {
    throw new Error('Delivery area not found');
  }

  // Calculate pricing
  const unitPrice = selectedSize.basePrice;
  const totalPrice = unitPrice * formData.quantity;
  const deliveryFee = deliveryArea.deliveryFee;

  // Generate order number
  const now = new Date();
  const orderNumber = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime() % 10000}`;

  // Create order
  const ordersRef = collection(db, `websites/${WEBSITE_ID}/orders`);
  const orderData = {
    orderNumber,
    customerName: formData.customerName,
    customerPhone: formData.customerPhone,
    customerEmail: formData.customerEmail,
    productId: formData.productId,
    productName: product.name,
    flavorName: formData.flavorName,
    sizeName: formData.sizeName,
    quantity: formData.quantity,
    unitPrice,
    totalPrice,
    deliveryAddress: formData.deliveryAddress,
    deliveryArea: formData.deliveryArea,
    deliveryFee,
    specialInstructions: formData.specialInstructions || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  await addDoc(ordersRef, orderData);

  return orderNumber;
}

// ============================================================================
// HELPERS
// ============================================================================

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function isBusinessOpen(hours: BusinessSettings['hours']): boolean {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const todayHours = hours.find(h => h.day === dayName);

  if (!todayHours || todayHours.isClosed) return false;

  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
}

export function getTodayHours(hours: BusinessSettings['hours']): string {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const todayHours = hours.find(h => h.day === dayName);

  if (!todayHours) return 'Unknown';
  if (todayHours.isClosed) return 'Closed';

  return `${todayHours.open} - ${todayHours.close}`;
}
