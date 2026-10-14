import assert from 'node:assert/strict';
import test from 'node:test';
import { createScrollEnvironment } from './helpers/scroll-environment.mjs';

test('connector end plays the next opening instead of jumping to its heading', async (t) => {
  const env = createScrollEnvironment();
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  env.frame();
  await env.load();
  const next = env.video('two.mp4');
  const seekCount = next.seeks.length;
  env.playFor('conn-1.mp4', 3000);
  await env.load();
  env.frame();
  assert.ok(env.window.scrollY <= 1500, 'connector end must not teleport 180px into the next stage');
  assert.equal(next.playCalls, 1, 'the next stage must actually play its opening');
  assert.ok(next.currentTime < 0.05, 'begin at the matching first frame');
  assert.ok(next.seeks.slice(seekCount).every((time) => time < 0.05), 'do not seek straight to the text reveal frame');

  env.playFor('two.mp4', 200);
  const copy = env.container.querySelectorAll('.sw-copy')[1];
  assert.ok(env.window.scrollY > 1500 && env.window.scrollY < 1680, 'track the intermediate opening frames');
  assert.ok(Number(copy.style.opacity) > 0 && Number(copy.style.opacity) < 1, 'reveal the text gradually along those frames');
  env.playFor('two.mp4', 600);
  assert.equal(next.paused, true);
  assert.ok(env.window.scrollY >= 1680 && env.window.scrollY < 1700, 'stop near the text reveal, within one playback-frame tolerance');
  assert.equal(Number(copy.style.opacity), 1);
  assert.equal(env.video('conn-1.mp4').playCalls, 1);
});

test('linger mapping returns manual scrubbing at the played frame, with no seek or idle animation loop', async (t) => {
  for (const linger of [0, 0.22, 0.5, 1]) {
    const env = createScrollEnvironment({ linger });
    t.after(env.cleanup);
    await env.ready();
    env.userScroll(1050);
    await env.load();
    const next = env.video('two.mp4');
    env.video('conn-1.mp4').finish();
    const seekCount = next.seeks.length;
    env.playFor('two.mp4', 1500);
    const p = 0.18, c = p - 0.5;
    const endpoint = ((1 - linger) * p + linger * (4 * c ** 3 + 0.5)) * next.duration;
    assert.ok(next.currentTime >= endpoint && next.currentTime < endpoint + 0.033, `linger ${linger}: stop within one played frame`);
    assert.ok(env.window.scrollY >= 1680 && env.window.scrollY < 1700);
    assert.deepEqual(next.seeks.slice(seekCount), [], 'native playback and release must not issue scrub seeks');
    assert.equal(next.paused, true);
    assert.equal(env.window.emit('wheel').defaultPrevented, undefined, 'scroll input is released');
    assert.equal(env.frames.size, 0, 'do not animate indefinitely after handoff');
    assert.equal(env.timers.size, 0);
    env.userScroll(env.window.scrollY + 60);
    assert.ok(next.seeks.length > seekCount, 'subsequent deliberate scrolling resumes normal scrubbing');
  }
});

test('buffering holds the connector final frame until the next opening has data', async (t) => {
  const holdData = ['two.mp4'];
  const env = createScrollEnvironment({ holdData });
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  await env.load();
  const connector = env.video('conn-1.mp4'), next = env.video('two.mp4');
  connector.finish();
  env.frame();
  const y = env.window.scrollY;
  const seekCount = connector.seeks.length;
  for (let i = 0; i < 8; i++) env.frame();
  assert.equal(next.playCalls, 0);
  assert.equal(env.window.scrollY, y, 'waiting is not synthetic time progression');
  assert.equal(Number(connector.parentNode.style.opacity), 1);
  assert.equal(Number(next.parentNode.style.opacity ?? 0), 0);
  assert.equal(connector.currentTime, connector.duration);
  assert.equal(connector.seeks.length, seekCount);
  assert.ok(env.urls.size <= 3);
  holdData.length = 0;
  await env.load();
  env.frame();
  assert.equal(next.playCalls, 1);
  assert.equal(next.currentTime, 0);
  assert.equal(env.window.scrollY, 1500);
  env.playFor('two.mp4', 800);
  assert.equal(next.paused, true);
  assert.ok(env.window.scrollY >= 1680);
});

test('an old seek and the reset-to-zero seek both settle before the next clip is revealed', async (t) => {
  const env = createScrollEnvironment();
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  await env.load();
  const next = env.video('two.mp4');
  next.deferSeeks = true;
  next.currentTime = 0.9;
  env.video('conn-1.mp4').finish();
  env.frame();
  assert.equal(next.playCalls, 0);
  next.completeSeek();
  env.frame();
  assert.equal(next.currentTime, 0);
  assert.equal(next.seeking, true);
  assert.equal(next.playCalls, 0, 'wait for the reset frame, not just its assigned time');
  next.completeSeek();
  env.frame();
  assert.equal(next.playCalls, 1);
  assert.equal(env.window.scrollY, 1500);
  env.playFor('two.mp4', 800);
  assert.equal(next.paused, true);
  assert.deepEqual(next.seeks, [0.9, 0], 'the only playback seek resets the hidden opening');
});

test('mobile priming and late data events cannot steal next-opening playback', async (t) => {
  const env = createScrollEnvironment({ mobile: true });
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  await env.load();
  const next = env.video('two.mp4');
  env.window.emit('pointerdown');
  next.emit('loadeddata');
  await env.load();
  assert.equal(next.playCalls, 0, 'reserve the next opening before the connector ends');
  env.video('conn-1.mp4').finish();
  next.emit('loadeddata');
  env.window.emit('touchstart');
  await env.load();
  env.frame();
  assert.equal(next.paused, false);
  assert.equal(next.playCalls, 1);
  env.playFor('two.mp4', 800);
  assert.equal(next.paused, true);
  assert.ok(env.window.scrollY >= 1680 && env.window.scrollY < 1700);
});

test('zero handoff progress preserves seam-only behavior without next-opening autoplay', async (t) => {
  const env = createScrollEnvironment({ connectorHandoffProgress: 0 });
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  await env.load();
  env.video('conn-1.mp4').finish();
  env.frame();
  assert.equal(env.window.scrollY, 1500);
  assert.equal(env.video('two.mp4').playCalls, 0);
  assert.equal(env.window.emit('wheel').defaultPrevented, undefined);
  assert.equal(env.timers.size, 0);
});

test('connector and opening watchdogs release input without fabricating progress', async (t) => {
  for (const phase of ['connector', 'intro']) {
    const env = createScrollEnvironment();
    t.after(env.cleanup);
    await env.ready();
    env.userScroll(1050);
    await env.load();
    if (phase === 'intro') {
      env.video('conn-1.mp4').finish();
      env.playFor('two.mp4', 160);
    }
    const y = env.window.scrollY;
    const active = env.video(phase === 'intro' ? 'two.mp4' : 'conn-1.mp4');
    active.readyState = 1; // A stalled decoder cannot advance its media clock.
    const timer = [...env.timers.values()][0];
    assert.ok(timer);
    env.runTimer(timer.delay);
    env.frame();
    assert.equal(env.window.scrollY, y, `${phase}: timeout is not successful playback`);
    assert.ok(y < 1680);
    assert.equal(active.paused, true);
    assert.equal(env.window.emit('wheel').defaultPrevented, undefined);
    assert.equal(env.timers.size, 0);
  }
});

test('waiting timeout cannot resume the opening when data eventually arrives', async (t) => {
  const holdData = ['two.mp4'];
  const env = createScrollEnvironment({ holdData });
  t.after(env.cleanup);
  await env.ready();
  env.userScroll(1050);
  await env.load();
  const next = env.video('two.mp4');
  env.video('conn-1.mp4').finish();
  env.frame();
  const y = env.window.scrollY;
  env.runTimer(4000);
  holdData.length = 0;
  await env.load();
  env.frame();
  assert.equal(env.window.scrollY, y);
  assert.equal(next.playCalls, 0);
  assert.equal(env.window.emit('wheel').defaultPrevented, undefined);
});

test('play rejection, decode error and failed next-clip fetch never trap scrolling', async (t) => {
  for (const failure of ['play', 'decode', 'fetch']) {
    const env = createScrollEnvironment({ failFetch: failure === 'fetch' ? ['two.mp4'] : [] });
    t.after(env.cleanup);
    await env.ready();
    env.userScroll(1050);
    await env.load();
    if (failure !== 'fetch') {
      const next = env.video('two.mp4');
      if (failure === 'play') next.playResult = () => Promise.reject(new Error('playback denied'));
      env.video('conn-1.mp4').finish();
      if (failure === 'decode') next.emit('error');
      await env.load();
      env.frame();
      assert.equal(next.paused, true);
    }
    assert.equal(env.window.emit('wheel').defaultPrevented, undefined, `${failure}: release the scroll lock`);
    assert.ok(env.window.scrollY < 1680, `${failure}: do not skip ahead to the text`);
    assert.equal(env.timers.size, 0);
  }
});

test('cleanup during waiting or opening removes callbacks, timers, videos and frame scheduling', async () => {
  for (const phase of ['waiting', 'intro']) {
    const env = createScrollEnvironment({ holdData: phase === 'waiting' ? ['two.mp4'] : [] });
    await env.ready();
    env.userScroll(1050);
    await env.load();
    const connector = env.video('conn-1.mp4'), next = env.video('two.mp4');
    connector.finish();
    env.frame();
    env.cleanup();
    env.cleanup();
    const y = env.window.scrollY;
    for (const video of [connector, next]) {
      for (const type of ['playing', 'loadeddata', 'seeked', 'timeupdate', 'ended']) video.emit(type);
      for (const listeners of video.listeners.values()) assert.equal(listeners.length, 0);
      assert.equal(video.paused, true);
    }
    env.frame();
    assert.equal(env.window.scrollY, y);
    assert.equal(env.frames.size, 0);
    assert.equal(env.timers.size, 0);
    assert.equal(env.urls.size, 0);
    assert.equal(env.container.children.length, 0);
  }
});
