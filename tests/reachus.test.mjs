import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/app/reachus/page.tsx', import.meta.url), 'utf8');
const view = readFileSync(new URL('../src/components/reachus/ReachUsView.tsx', import.meta.url), 'utf8');
const whatsAppButton = readFileSync(new URL('../src/components/WhatsAppButton.tsx', import.meta.url), 'utf8');

test('/reachus route is public and standalone (unbound from global storefront chrome)', () => {
  assert.match(page, /import ReachUsView from ['"]@\/components\/reachus\/ReachUsView['"]/);
  assert.match(page, /export const metadata/);
  assert.match(page, /<ReachUsView\s*\/>/);
  // Must NOT be wrapped in SiteChrome or PublicPageFrame
  assert.doesNotMatch(page, /PublicPageFrame/);
  assert.doesNotMatch(page, /SiteChrome/);
  assert.doesNotMatch(view, /PublicPageFrame/);
  assert.doesNotMatch(view, /SiteChrome/);
});

test('floating WhatsApp button is suppressed on /reachus to prevent duplication', () => {
  assert.match(whatsAppButton, /pathname === ['"]\/reachus['"]/);
});

test('reachus view contains all required social channels with in-app deep linking and web fallbacks', () => {
  // WhatsApp
  assert.match(view, /whatsapp:\/\//);
  assert.match(view, /wa\.me/);

  // Facebook with in-app scheme
  assert.match(view, /fb:\/\/facewebmodal/);
  assert.match(view, /facebook\.com/);

  // Instagram with in-app scheme
  assert.match(view, /instagram:\/\/user\?username=/);
  assert.match(view, /instagram\.com/);

  // YouTube with in-app scheme
  assert.match(view, /vnd\.youtube:\/\//);
  assert.match(view, /youtube\.com/);

  // Gmail with in-app scheme and webmail fallback
  assert.match(view, /googlegmail:\/\/\//);
  assert.match(view, /mailto:/);

  // Phone Call
  assert.match(view, /tel:/);

  // Cake Menu Link
  assert.match(view, /\/products/);
});

test('reachus view supports scannable QR display, vCard contact download and link sharing', () => {
  assert.match(view, /BEGIN:VCARD/);
  assert.match(view, /END:VCARD/);
  assert.match(view, /api\.qrserver\.com/);
  assert.match(view, /navigator\.share/);
});

test('reachus renders the official emblem and infinity cherry blossom falling animation', () => {
  // Official emblem
  assert.match(view, /\/assets\/flomira-emblem\.webp/);
  // Cherry blossom stream
  assert.match(view, /import CherryBlossomStream from ['"]@\/components\/effects\/CherryBlossomStream['"]/);
  assert.match(view, /<CherryBlossomStream/);
});

test('reachus points to all channels under flomira0910 and +880 1621-084775', () => {
  assert.match(view, /flomira0910@gmail\.com/);
  assert.match(view, /facebook\.com\/flomira0910/);
  assert.match(view, /instagram\.com\/flomira0910/);
  assert.match(view, /youtube\.com\/@flomira0910/);
  assert.match(view, /8801621084775/);
  assert.doesNotMatch(view, /flomira\.official/);
  assert.doesNotMatch(view, /@@/); // Guarantees no double @ anywhere
});
