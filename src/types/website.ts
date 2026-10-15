export interface ProductFlavor {
  name: string;
  description: string;
}

export interface ProductSize {
  /** A stable client-side key derived at the Firestore boundary when absent. */
  id?: string;
  label: string;
  servings: number;
  basePrice: number;
}

export interface WebsiteProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  flavors: ProductFlavor[];
  sizes: ProductSize[];
  allergens: string[];
  leadTimeDays: number;
  featured: boolean;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ScrollSection {
  id: string;
  title: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  buttonText?: string;
  buttonLink?: string;
  order: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface DeliveryArea {
  name: string;
  deliveryFee: number;
  minimumOrder: number;
}

export interface SocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
}

export interface BusinessSettings {
  id: string;
  businessName: string;
  logoUrl: string;
  description: string;
  phoneNumber: string;
  email: string;
  whatsappNumber: string;
  address: string;
  hours: BusinessHours[];
  deliveryAreas: DeliveryArea[];
  socialMedia: SocialMedia;
  acceptsOrders: boolean;
  updatedAt: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  productId: string;
  productName: string;
  flavorName: string;
  sizeName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryAddress: string;
  deliveryArea: string;
  deliveryFee: number;
  specialInstructions: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  completedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface OrderFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  productId: string;
  flavorName: string;
  sizeName: string;
  quantity: number;
  deliveryAddress: string;
  deliveryArea: string;
  specialInstructions: string;
}
