import assert from 'node:assert/strict';
import test from 'node:test';
import { createScrollEnvironment } from './helpers/scroll-environment.mjs';

test('entering a connector locks its position instantly, even with CSS smooth scrolling', async (t) => {
  const env = createScrollEnvironment();
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  assert.equal(env.video('conn-1.mp4').playCalls, 1);
  assert.equal(env.window.scrollY, 1000, 'the autoplay lock must not animate backward through the preceding scene');
  assert.equal(env.smoothTarget, null, 'no internal smooth scroll should remain queued');
});

test('2x connector and next opening finish at readable copy without replaying the connector', async (t) => {
  const env = createScrollEnvironment();
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  env.advanceSmooth(); // Settle the entry scroll on the unfixed engine too.
  await env.load();
  const connector = env.video('conn-1.mp4');
  assert.equal(connector.playbackRate, 2.0);
  const watchdogDelays = [...env.timers.values()].map((timer) => timer.delay);
  assert.ok(watchdogDelays.some((delay) => Math.abs(delay - (6 / 2 * 1000 + 700)) < 0.01), 'the watchdog must account for the faster playback rate');
  connector.finish();
  assert.equal(env.window.scrollY, 1500, 'begin at the next first frame, not at the heading');
  assert.equal(env.smoothTarget, null);
  const seekCount = connector.seeks.length;
  env.playFor('two.mp4', 800);
  assert.ok(env.window.scrollY >= 1680 && env.window.scrollY < 1700, 'play the opening before releasing scroll control');
  for (let i = 0; i < 12; i++) { env.frame(); env.advanceSmooth(0.4); }
  const copy = env.container.querySelectorAll('.sw-copy')[1];
  assert.equal(Number(copy.style.opacity), 1, 'the next heading should be readable, not frozen in a dim fade-in');
  assert.equal(copy.style.pointerEvents, 'auto');
  assert.equal(connector.playCalls, 1, 'completion events must not nominate the same connector again');
  assert.deepEqual(connector.seeks.slice(seekCount), [], 'the completed final frame must not rewind during handoff');
});

test('small seam jitter does not replay a connector but leaving and returning can play again', async (t) => {
  const env = createScrollEnvironment();
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  env.advanceSmooth();
  await env.load();
  const connector = env.video('conn-1.mp4');
  connector.finish();
  env.playFor('two.mp4', 800);
  env.advanceSmooth();
  env.frame();
  const seekCount = connector.seeks.length;
  for (const y of [1679.9, 1680.1, 1679.8, 1680]) env.userScroll(y);
  assert.equal(connector.playCalls, 1);
  assert.equal(connector.seeks.length, seekCount);
  env.userScroll(800);
  env.userScroll(900); // Establish the intentional forward return within the preceding dive.
  env.userScroll(1050);
  assert.equal(connector.playCalls, 2, 'an intentional new forward visit should still autoplay');
});

test('mobile first-gesture priming cannot pause an autoplaying connector', async (t) => {
  const env = createScrollEnvironment({ mobile: true });
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  env.advanceSmooth();
  await env.load();
  const connector = env.video('conn-1.mp4');
  assert.equal(connector.paused, false);
  env.window.emit('pointerdown');
  await env.load();
  assert.equal(connector.paused, false, 'play/pause priming must not take ownership away from connector autoplay');
});

test('mobile priming never starts a connector before its deliberate autoplay visit', async (t) => {
  const env = createScrollEnvironment({ mobile: true });
  t.after(env.cleanup);
  await env.ready();
  const connector = env.video('conn-1.mp4');
  env.window.emit('pointerdown');
  connector.emit('loadeddata');
  assert.equal(connector.playCalls, 0, 'connector warm-up must not be visible playback');
  env.userScroll(1050);
  assert.equal(connector.playCalls, 1);
});

test('a late loadeddata event cannot stop connector autoplay', async (t) => {
  const env = createScrollEnvironment();
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  const connector = env.video('conn-1.mp4');
  connector.emit('loadeddata');
  assert.equal(connector.paused, false);
});

test('reduced-motion mode fetches and autoplays no video', async (t) => {
  const env = createScrollEnvironment({ reduced: true });
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  env.userScroll(1550);
  assert.equal(env.requests.length, 0);
  assert.equal(env.scrollCalls.length, 0);
});

test('cleanup during connector playback releases timers, listeners, videos, and scheduled frames', async () => {
  const env = createScrollEnvironment();
  await env.ready();
  env.userScroll(1050);
  await env.load();
  const connector = env.video('conn-1.mp4');
  env.cleanup();
  env.cleanup();
  env.frame();
  assert.equal(env.container.children.length, 0);
  assert.equal(env.timers.size, 0);
  assert.equal(env.frames.size, 0);
  assert.equal(env.urls.size, 0);
  assert.equal(connector.paused, true);
  for (const listeners of env.window.listeners.values()) assert.equal(listeners.length, 0);
});

test('opening copy stays readable and its motion never replaces CSS centering', async (t) => {
  const env = createScrollEnvironment();
  t.after(env.cleanup);
  await env.ready();
  const copy = env.container.querySelectorAll('.sw-copy')[0];
  assert.equal(Number(copy.style.opacity), 1);
  assert.equal(copy.style.transform, undefined, 'CSS must keep control of desktop centering and mobile anchoring');
  assert.equal(copy.style['--sw-copy-offset'], '0px');
  env.userScroll(200);
  assert.equal(Number(copy.style.opacity), 1, 'the first gentle scroll should not immediately fade out the introduction');
});

test('scene text allows native page scroll chaining while keeping long copy readable', async (t) => {
  const env = createScrollEnvironment();
  t.after(env.cleanup);
  await env.ready();
  const css = env.document.getElementById('sw-css').textContent;
  const copyRules = [...css.matchAll(/\.sw-copy\s*\{([^}]*)\}/g)].map((match) => match[1]);
  assert.ok(copyRules.length > 0);
  // CSS contract only: the stand-in DOM does not implement browser scroll chaining.
  assert.match(copyRules[0], /overscroll-behavior\s*:\s*auto\s*;/, 'text must not trap wheel/touch input when it fits or reaches an edge');
  assert.match(copyRules[0], /overflow-y\s*:\s*auto\s*;/, 'retain access to long copy on short or zoomed viewports');
  assert.match(copyRules[0], /max-height\s*:/);
  for (const rules of copyRules) {
    assert.doesNotMatch(rules, /overscroll-behavior(?:-y)?\s*:\s*(?:contain|none)/, 'responsive overrides must also allow chaining');
  }
});

test('wheel and touch input over readable text remain native outside connector playback', async (t) => {
  for (const options of [{}, { mobile: true }, { reduced: true }]) {
    const env = createScrollEnvironment(options);
    t.after(env.cleanup);
    await env.ready();
    const copy = env.container.querySelectorAll('.sw-copy')[0];
    assert.equal(copy.inert, false);
    assert.equal(copy.style.pointerEvents, 'auto', 'do not fix scrolling by disabling selection and links');
    for (const deltaY of [-120, 120]) {
      const event = env.window.emit('wheel', { target: copy, deltaY });
      assert.notEqual(event.defaultPrevented, true);
    }
    assert.notEqual(env.window.emit('touchmove', { target: copy }).defaultPrevented, true);
  }
});

test('the final-stage copy and actions are readable after its opening plays', async (t) => {
  const env = createScrollEnvironment({ initialY: 2400 });
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(2550);
  const connector = env.video('conn-2.mp4');
  assert.equal(connector.playCalls, 1);
  connector.finish();
  await env.load();
  env.frame();
  env.playFor('three.mp4', 800);
  const copy = env.container.querySelectorAll('.sw-copy')[2];
  assert.ok(env.window.scrollY >= 3180 && env.window.scrollY < 3200);
  assert.equal(Number(copy.style.opacity), 1);
  assert.equal(copy.inert, false, 'visible final actions must be keyboard accessible');
  assert.equal(copy.style.pointerEvents, 'auto');
});

test('reduced motion retains the layout anchor without animated copy drift', async (t) => {
  const env = createScrollEnvironment({ reduced: true });
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1680);
  const copies = env.container.querySelectorAll('.sw-copy');
  assert.equal(copies[1].style.transform, undefined);
  assert.equal(copies[1].style['--sw-copy-offset'], '0px');
  assert.equal(copies[0].inert, true);
  assert.equal(copies[0].attributes.get('aria-hidden'), 'true');
  assert.equal(copies[1].inert, false);
});

test('handoff refreshes the media budget for the next stage without exceeding three clips', async (t) => {
  const env = createScrollEnvironment();
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  env.frame();
  await env.load();
  env.video('conn-1.mp4').finish();
  env.playFor('two.mp4', 800);
  env.frame();
  await env.load();
  assert.ok(env.requests.some(({ url }) => url === 'conn-2.mp4'), 'prefetch the next connector while its preceding stage text is open');
  assert.ok(env.urls.size <= 3, 'the handoff must retain the existing clip budget');
});

test('an early return from the next heading does not restart the completed connector', async (t) => {
  const env = createScrollEnvironment();
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  env.frame();
  await env.load();
  const connector = env.video('conn-1.mp4');
  connector.finish();
  env.playFor('two.mp4', 800);
  env.frame();
  const seekCount = connector.seeks.length;
  for (const y of [1750, 1900, 1400, 1300, 1350, 1500]) env.userScroll(y);
  assert.equal(connector.playCalls, 1);
  assert.equal(connector.seeks.length, seekCount, 'keep the last frame through the opening-copy region and seam');
});

test('internal scrolling restores the page smooth-scroll setting after handoff', async (t) => {
  const env = createScrollEnvironment();
  t.after(env.cleanup);
  await env.ready();
  env.document.documentElement.style.scrollBehavior = 'smooth';
  env.userScroll(1050);
  env.frame();
  await env.load();
  env.video('conn-1.mp4').finish();
  env.playFor('two.mp4', 800);
  env.frame();
  assert.equal(env.document.documentElement.style.scrollBehavior, 'smooth');
  env.window.scrollTo(0, 2000);
  assert.equal(env.smoothTarget, 2000, 'ordinary numeric scrolling still follows page CSS in the test environment');
});
