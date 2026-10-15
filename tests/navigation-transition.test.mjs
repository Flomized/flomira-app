import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../src/components/NavigationTransition.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

test('the root navigation transition owns internal link zoom-blur navigation', () => {
  assert.match(layout, /import NavigationTransition from ['"]@\/components\/NavigationTransition['"]/);
  assert.match(layout, /<NavigationTransition\s*\/>/);
  assert.match(component, /document\.addEventListener\('click', handleClick, true\)/);
  assert.match(component, /router\.prefetch\(destinationPath\)/);
  assert.match(component, /router\.push\(destination, \{ scroll: true \}\)/);
  assert.match(component, /anchor\.classList\.contains\('sw-zoom-link'\)/);
  assert.doesNotMatch(component, /anchor\.closest\('\.sw-root'\)/);
  assert.match(component, /prefers-reduced-motion/);
});

test('navigation motion zooms and blurs in both directions with accessible resets', () => {
  assert.match(css, /@keyframes flomira-page-exit/);
  assert.match(css, /@keyframes flomira-page-enter/);
  assert.match(css, /html\.flomira-nav-exiting \.site-frame > main/);
  assert.match(css, /html\.flomira-nav-entering \.site-frame > main/);
  assert.doesNotMatch(css, /html\.flomira-nav-exiting \.site-frame,\n/);
  assert.match(css, /flomira-nav-exiting \.site-frame > main, html\.flomira-nav-exiting #world/);
  assert.match(css, /animation: flomira-page-exit 560ms/);
  assert.match(css, /animation: flomira-page-enter 560ms/);
});
