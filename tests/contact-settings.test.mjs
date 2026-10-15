import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/app/contact/page.tsx', import.meta.url), 'utf8');
const details = readFileSync(new URL('../src/components/contact/BusinessDetails.tsx', import.meta.url), 'utf8');
const chrome = readFileSync(new URL('../src/components/SiteChrome.tsx', import.meta.url), 'utf8');
const provider = readFileSync(new URL('../src/components/BusinessSettingsProvider.tsx', import.meta.url), 'utf8');
const scrollEngine = readFileSync(new URL('../src/components/ScrollEngine.tsx', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../src/components/scrub-engine.js', import.meta.url), 'utf8');

test('contact page renders live business details through the shared settings provider', () => {
  assert.match(page, /import BusinessDetails from ['"]@\/components\/contact\/BusinessDetails['"]/);
  assert.match(page, /<BusinessDetails\s*\/>/);
  assert.doesNotMatch(page, /<Suspense/);
  assert.doesNotMatch(page, /To be confirmed before launch/);
});

test('business details render configured contact, WhatsApp, hours, and service areas', () => {
  assert.match(details, /useBusinessSettings/);
  assert.match(details, /mailto:/);
  assert.match(details, /tel:/);
  assert.match(details, /getWhatsAppUrl/);
  assert.match(details, /settings\.hours/);
  assert.match(details, /settings\.deliveryAreas/);
  assert.match(details, /settings\.acceptsOrders/);
});

test('the saved business name, logo, and description feed the shared storefront brand', () => {
  assert.match(provider, /getBusinessSettings/);
  assert.match(chrome, /businessName/);
  assert.match(chrome, /logoUrl/);
  assert.match(chrome, /description/);
});

test('the cinematic homepage receives the saved business brand without changing the engine contract', () => {
  assert.match(scrollEngine, /useBusinessSettings/);
  assert.match(scrollEngine, /logoUrl/);
  assert.match(scrollEngine, /description/);
  assert.match(engine, /config\.brand\.logoUrl/);
  assert.match(engine, /config\.brand\.description/);
});
