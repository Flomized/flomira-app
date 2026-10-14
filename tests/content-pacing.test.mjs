import assert from 'node:assert/strict';
import test from 'node:test';
import { sections, siteConfig } from '../src/data/content.ts';

test('the cinematic configuration pairs 2x connectors and copy-opening handoffs with slower dives', () => {
  assert.equal(siteConfig.connectorPlaybackRate, 2.0);
  assert.equal(siteConfig.connectorHandoffProgress, 0.18);
  assert.equal(siteConfig.diveScroll, 2.8);
  assert.deepEqual(Object.fromEntries(sections.map((section) => [section.id, section.scroll])), {
    ingredients: 2.8,
    mixing: 2.8,
    baking: 2.8,
    custom_design: 3.0,
    pound_cakes: 2.8,
    hero: 3.0,
  });
});
