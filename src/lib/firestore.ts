import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  WebsiteProduct,
  ScrollSection,
  BusinessSettings,
  CustomerOrder,
  OrderFormData
} from '@/types/website';

const WEBSITE_ID = 'default';

// ============================================================================
// PRODUCTS
// ============================================================================

export async function getProducts(): Promise<WebsiteProduct[]> {
  const productsRef = collection(db, `websites/${WEBSITE_ID}/products`);
  const q = query(productsRef, where('visible', '==', true));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as WebsiteProduct));
}

export async function getProductBySlug(slug: string): Promise<WebsiteProduct | null> {
  const productsRef = collection(db, `websites/${WEBSITE_ID}/products`);
  const q = query(productsRef, where('slug', '==', slug), where('visible', '==', true));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as WebsiteProduct;
}

export async function getFeaturedProducts(): Promise<WebsiteProduct[]> {
  const productsRef = collection(db, `websites/${WEBSITE_ID}/products`);
  const q = query(
    productsRef,
    where('featured', '==', true),
    where('visible', '==', true)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as WebsiteProduct));
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

  const product = productDoc.data() as WebsiteProduct;

  // Find selected size
  const selectedSize = product.sizes.find(s => s.name === formData.sizeName);
  if (!selectedSize) {
    throw new Error('Size not found');
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
  const unitPrice = selectedSize.price;
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

  const docRef = await addDoc(ordersRef, orderData);

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
