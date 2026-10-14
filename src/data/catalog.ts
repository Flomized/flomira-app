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

// Demo products removed - all product data now comes from Firestore via Flutter app
export const products: readonly Product[] = [];

export function getProduct(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}
