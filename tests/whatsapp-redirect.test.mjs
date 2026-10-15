import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getWhatsAppUrl, normalizeWhatsAppNumber } from '../src/lib/whatsapp.ts';

const route = readFileSync(new URL('../src/app/whatsapp/route.ts', import.meta.url), 'utf8');

test('normalizes international WhatsApp settings into safe wa.me digits', () => {
  assert.equal(normalizeWhatsAppNumber('+880 1750-333599'), '8801750333599');
  assert.equal(normalizeWhatsAppNumber('00880 (1750) 333599'), '8801750333599');
  assert.equal(normalizeWhatsAppNumber('8801750333599'), '8801750333599');
  assert.equal(normalizeWhatsAppNumber('01750-333599'), null);
  assert.equal(normalizeWhatsAppNumber('+880 abc'), null);
  assert.equal(normalizeWhatsAppNumber(''), null);
  assert.equal(normalizeWhatsAppNumber(null), null);
});

test('the stable QR destination follows the current configured number', () => {
  assert.equal(getWhatsAppUrl('+880 1750-333599'), 'https://wa.me/8801750333599');
  assert.equal(
    getWhatsAppUrl('+880 1750-333599', 'Hi!'),
    'https://wa.me/8801750333599?text=Hi!',
  );
  assert.equal(getWhatsAppUrl('01750-333599'), null);
});

test('the /whatsapp route is a non-cached temporary redirect, not an open redirect', () => {
  assert.match(route, /export async function GET/);
  assert.match(route, /await connection\(\)/);
  assert.match(route, /getBusinessSettings/);
  assert.match(route, /getWhatsAppUrl/);
  assert.match(route, /status: 307/);
  assert.match(route, /Cache-Control.*no-store/);
  assert.doesNotMatch(route, /dynamic\s*=/);
  assert.doesNotMatch(route, /revalidate\s*=/);
  assert.doesNotMatch(route, /use cache/);
});
