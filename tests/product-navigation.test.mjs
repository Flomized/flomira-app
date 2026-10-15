import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/app/products/page.tsx', import.meta.url), 'utf8');
const chrome = readFileSync(new URL('../src/components/SiteChrome.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');

test('products page uses the shared shell instead of rendering a second navigation rail', () => {
  assert.match(page, /<PublicPageFrame>/);
  assert.doesNotMatch(page, /ProductNavChips/);
});

test('the shared header remains the single discoverable storefront navigation', () => {
  assert.match(chrome, /aria-label="Main navigation"/);
  for (const href of ["'/products'", "'/favorites'", "'/orders'", "'/contact'", "'/faq'"]) {
    assert.match(chrome, new RegExp(`href: ${href.replaceAll('/', '\\/')}`));
  }
  assert.match(chrome, /href="\/cart"/);
  assert.match(chrome, /Order now/);
});

test('the storefront shell owns one WhatsApp contact action for every public page', () => {
  assert.match(layout, /import WhatsAppButton from ['"]@\/components\/WhatsAppButton['"]/);
  assert.match(layout, /<WhatsAppButton\s*\/>/);
  assert.doesNotMatch(chrome, /WhatsAppButton/);
  assert.doesNotMatch(page, /WhatsAppButton/);
});
