import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const websiteTypes = read('src/types/website.ts');
const firestore = read('src/lib/firestore.ts');
const catalog = read('src/data/catalog.ts');
const results = read('src/components/ProductResults.tsx');
const detail = read('src/app/products/[id]/page.tsx');
const orderForm = read('src/components/OrderForm.tsx');
const cartProvider = read('src/components/CartProvider.tsx');
const checkout = read('src/components/checkout/CheckoutPlanner.tsx');

test('the web boundary names the Flutter product schema canonically', () => {
  for (const field of ['slug', 'category', 'imageUrl', 'imageAlt', 'flavors', 'leadTimeDays', 'featured']) {
    assert.match(websiteTypes, new RegExp(`\\b${field}\\b`));
  }
  assert.match(websiteTypes, /label: string/);
  assert.match(websiteTypes, /basePrice: number/);
  assert.match(firestore, /normalizeWebsiteProduct/);
  assert.match(firestore, /selectedSize\.basePrice/);
});

test('live product surfaces do not read the retired image/size fields', () => {
  assert.doesNotMatch(results, /product\.images|size\.name|size\.price/);
  assert.doesNotMatch(detail, /product\.images|size\.name|size\.price/);
  assert.doesNotMatch(orderForm, /size\.name|size\.price/);
  assert.match(orderForm, /product\.flavors\.map/);
});

test('the local preview keeps live prices in cents and threads its catalog into drafts', () => {
  assert.match(catalog, /Math\.round\(value \* 100\)/);
  assert.match(catalog, /websiteProductToProduct/);
  assert.match(cartProvider, /websiteProductsToCatalog/);
  assert.match(cartProvider, /getProducts/);
  assert.match(checkout, /getOrderItems\(cart\.items, cart\.catalog\)/);
  assert.match(checkout, /createOrderDraft\([^\n]+cart\.catalog\)/);
});
