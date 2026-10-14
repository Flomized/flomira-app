import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Deterministic DOM/media stand-ins for the real mountLetsScroll entry point.
// These tests exercise scheduling and media ownership, not browser decoding/FPS.
class Events {
  listeners = new Map();
  addEventListener(type, listener, options = {}) {
    const entries = this.listeners.get(type) ?? [];
    entries.push({ listener, once: options?.once });
    this.listeners.set(type, entries);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry.listener !== listener));
  }
  emit(type, properties = {}) {
    const event = { type, preventDefault() { this.defaultPrevented = true; }, ...properties };
    for (const entry of [...(this.listeners.get(type) ?? [])]) {
      if (entry.once) this.removeEventListener(type, entry.listener);
      entry.listener(event);
    }
    return event;
  }
}

class Element extends Events {
  constructor(tag) {
    super();
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.attributes = new Map();
    this.classList = {
      add: (name) => { this.className = [...new Set([...this.className.split(' '), name])].join(' ').trim(); },
      remove: (name) => { this.className = this.className.split(' ').filter((item) => item !== name).join(' '); },
      toggle: (name, enabled) => { if (enabled) this.classList.add(name); else this.classList.remove(name); },
    };
  }
  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  removeChild(child) { this.children = this.children.filter((node) => node !== child); child.parentNode = null; }
  replaceChildren() { this.children.forEach((child) => { child.parentNode = null; }); this.children = []; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? (name === 'href' ? this.href ?? null : null); }
  hasAttribute(name) { return this.getAttribute(name) !== null; }
  removeAttribute(name) { this.attributes.delete(name); if (name === 'src') this.src = ''; }
  set innerHTML(html) {
    this.html = html;
    this.replaceChildren();
    // Only anchor nodes are needed by the navigation tests; no layout engine or
    // decoder is simulated. Preserve the exact attributes emitted by ctaBtns.
    for (const match of html.matchAll(/<a\s+class="([^"]*)"\s+href="([^"]*)">([^<]*)<\/a>/g)) {
      const link = new Element('a');
      link.className = match[1];
      link.href = match[2];
      link.textContent = match[3];
      this.appendChild(link);
    }
  }
  get innerHTML() { return this.html ?? ''; }
  querySelectorAll(selector) {
    return this.children.flatMap((child) => [
      ...(child.className.split(' ').includes(selector.slice(1)) ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }
}

class Video extends Element {
  constructor() {
    super('video');
    this.duration = 6;
    this.time = 0;
    this.paused = true;
    this.seeking = false;
    this.readyState = 0;
    this.playbackRate = 1;
    this.seeks = [];
    this.playCalls = 0;
    this.pauseCalls = 0;
  }
  get currentTime() { return this.time; }
  set currentTime(value) {
    this.seeks.push(value);
    this.time = value;
    if (this.deferSeeks) this.seeking = true;
  }
  completeSeek() { this.seeking = false; this.emit('seeked'); }
  play() {
    this.playCalls += 1;
    this.paused = false;
    this.emit('playing');
    return this.playResult?.() ?? Promise.resolve();
  }
  pause() { this.pauseCalls += 1; this.paused = true; }
  load() {}
  finish() { this.time = this.duration; this.paused = true; this.emit('ended'); }
  // Advance the media clock, not the seek setter. Playback assertions can now
  // distinguish actually traversed frames from a currentTime jump.
  advance(seconds) {
    if (this.paused || this.readyState < 2 || this.seeking) return;
    this.time = Math.min(this.duration, this.time + seconds);
    this.emit('timeupdate');
    if (this.time >= this.duration && !this.paused) this.finish();
  }
}

export function createScrollEnvironment({
  reduced = false, mobile = false, initialY = 0,
  connectorPlaybackRate = 2.0, connectorHandoffProgress = 0.18,
  ctaHref = '/products', onNavigate, onPrefetch, staleStyles = false,
  linger = 0, holdData = [], failFetch = [],
} = {}) {
  let clock = 0, sequence = 0;
  const frames = new Map(), timers = new Map(), urls = new Map();
  const scrollCalls = [], pendingEvents = [], requests = [], elements = [], navigations = [];
  class TestURL extends URL {
    static createObjectURL(blob) { const url = `blob:test-${++sequence}`; urls.set(url, blob.url); return url; }
    static revokeObjectURL(url) { urls.delete(url); }
  }
  const window = new Events();
  Object.assign(window, {
    innerHeight: 1000, innerWidth: mobile ? 390 : 1440, scrollY: initialY, pageYOffset: initialY,
    matchMedia: (query) => ({ matches: query.includes('reduced-motion') ? reduced : mobile }),
    URL: TestURL,
    location: { href: 'http://localhost:3000/', assign: (href) => navigations.push(href) },
  });
  let smoothTarget = null;
  const moveTo = (y) => {
    if (window.scrollY === y) return;
    window.scrollY = window.pageYOffset = y;
    pendingEvents.push(() => window.emit('scroll'));
  };
  window.scrollTo = (options, numericY) => {
    const top = typeof options === 'object' ? options.top : numericY;
    const behavior = typeof options === 'object' ? options.behavior ?? 'auto' : 'auto';
    scrollCalls.push({ top, behavior });
    // `auto`, including the numeric overload, follows the root's CSS behavior.
    // The engine must explicitly disable smooth scrolling for an internal jump.
    const inherited = document.documentElement.style.scrollBehavior || (reduced ? 'auto' : 'smooth');
    if (behavior === 'instant' || (behavior === 'auto' && inherited === 'auto')) {
      smoothTarget = null;
      moveTo(top);
    } else smoothTarget = top;
  };
  const document = {
    head: new Element('head'),
    documentElement: new Element('html'),
    body: new Element('body'),
    createElement: (tag) => {
      const element = tag === 'video' ? new Video() : new Element(tag);
      elements.push(element);
      return element;
    },
    getElementById: (id) => elements.find((element) => element.id === id) ?? null,
  };
  const sandbox = {
    window, document, console, AbortController,
    module: { exports: {} },
    performance: { now: () => clock },
    requestAnimationFrame: (callback) => { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id) => frames.delete(id),
    setTimeout: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    clearTimeout: (id) => timers.delete(id),
    fetch: async (url, options) => {
      requests.push({ url, signal: options.signal });
      return { ok: !failFetch.includes(url), blob: async () => ({ url }) };
    },
    URL: TestURL,
  };
  const source = readFileSync(new URL('../../src/components/scrub-engine.js', import.meta.url), 'utf8');
  runInNewContext(source, sandbox, { filename: 'scrub-engine.js' });
  const container = new Element('div');
  if (staleStyles) {
    const style = document.createElement('style');
    style.id = 'sw-css';
    style.textContent = '/* previous engine styles */';
    document.head.appendChild(style);
  }
  const config = {
    diveScroll: 1, connScroll: 0.5, connectorPlaybackRate, connectorHandoffProgress,
    crossfade: 0.16, atmosphere: false,
    cta: { label: 'Order now', href: ctaHref }, onNavigate, onPrefetch,
    sections: ['one', 'two', 'three'].map((id, index) => ({
      id, label: id, title: id, still: `${id}.webp`, clip: `${id}.mp4`, linger,
      ...(index === 2 ? { cta: { primary: { label: 'Explore products', href: '/products' } } } : {}),
    })),
    connectors: ['conn-1.mp4', 'conn-2.mp4'],
  };
  const cleanup = sandbox.module.exports.mountLetsScroll(container, config);

  function frame() {
    clock += 16;
    pendingEvents.splice(0).forEach((callback) => callback());
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(clock));
  }
  async function load() {
    for (let i = 0; i < 12; i++) await Promise.resolve();
    for (const video of elements.filter((element) => element instanceof Video)) {
      if (!video.src) continue;
      if (!video.metadataSent) {
        video.metadataSent = true;
        video.readyState = 1;
        video.emit('loadedmetadata');
      }
      if (!video.dataSent && !holdData.includes(urls.get(video.src))) {
        video.dataSent = true;
        video.readyState = 4;
        video.emit('loadeddata');
      }
    }
    for (let i = 0; i < 4; i++) await Promise.resolve();
  }

  return {
    window, document, container, config, frame, load, cleanup, scrollCalls, requests, timers, frames, urls, navigations,
    async ready() { frame(); await load(); frame(); },
    userScroll(y) { smoothTarget = null; moveTo(y); frame(); },
    get smoothTarget() { return smoothTarget; },
    advanceSmooth(fraction = 1) {
      if (smoothTarget === null) return;
      const next = window.scrollY + (smoothTarget - window.scrollY) * fraction;
      if (fraction === 1) smoothTarget = null;
      moveTo(next);
      frame();
    },
    video(url) { return elements.find((element) => element instanceof Video && urls.get(element.src) === url); },
    playFor(url, milliseconds, stepMs = 16) {
      const video = elements.find((element) => element instanceof Video && urls.get(element.src) === url);
      if (!video) throw new Error(`Video ${url} was not loaded`);
      for (let elapsed = 0; elapsed < milliseconds; elapsed += stepMs) {
        video.advance(Math.min(stepMs, milliseconds - elapsed) / 1000 * video.playbackRate);
        frame();
      }
    },
    runTimer(delay) {
      const entry = [...timers.entries()].find(([, timer]) => timer.delay === delay);
      if (!entry) throw new Error(`No pending ${delay}ms timer`);
      timers.delete(entry[0]);
      clock += delay;
      entry[1].callback();
    },
  };
}
