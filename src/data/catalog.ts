import type { WebsiteProduct } from '../types/website.ts';

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  image: string;
  imageAlt: string;
  flavors: readonly string[];
  sizes: readonly {
    id: string;
    label: string;
    servings: string;
    price: number;
  }[];
  allergens: readonly string[];
  leadTimeDays: number;
  featured: boolean;
};

export type Catalog = readonly Product[];

function priceToCents(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) && cents <= 100_000_000 ? cents : null;
}

function sizeKey(value: string, productId: string, index: number): string {
  const label = value.toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'size';
  return `${productId}-size-${label}-${index + 1}`;
}

/**
 * Converts the canonical Firebase product to the browser preview shape.
 * Firebase prices are major currency units; local drafts intentionally keep
 * their existing integer-cent representation.
 */
export function websiteProductToProduct(product: WebsiteProduct): Product | null {
  if (!product.id || !product.name) return null;

  const sizes = product.sizes.map((size, index) => {
    const price = priceToCents(size.basePrice);
    if (price === null || !size.label) return null;
    return {
      id: size.id || sizeKey(size.label, product.id, index),
      label: size.label,
      servings: String(size.servings),
      price,
    };
  }).filter((size): size is NonNullable<typeof size> => size !== null);
  const flavors = product.flavors.map((flavor) => flavor.name).filter(Boolean);

  if (!sizes.length || !flavors.length) return null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    description: product.description,
    image: product.imageUrl,
    imageAlt: product.imageAlt,
    flavors,
    sizes,
    allergens: [...product.allergens],
    leadTimeDays: product.leadTimeDays,
    featured: product.featured,
  };
}

export function websiteProductsToCatalog(products: readonly WebsiteProduct[]): Product[] {
  const seen = new Set<string>();
  return products.flatMap((product) => {
    const localProduct = websiteProductToProduct(product);
    if (!localProduct || seen.has(localProduct.id)) return [];
    seen.add(localProduct.id);
    return [localProduct];
  });
}

// Demo products removed - all product data now comes from Firestore via Flutter app
export const products: readonly Product[] = [];

export function getProduct(id: string, catalog: Catalog = products): Product | undefined {
  return catalog.find((product) => product.id === id);
}

export function getProductBySlug(slug: string, catalog: Catalog = products): Product | undefined {
  return catalog.find((product) => product.slug === slug);
}

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}
