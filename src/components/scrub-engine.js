/* ============================================================================
   lets-scroll — portable scroll-scrubbed camera-flight engine
   ----------------------------------------------------------------------------
   Framework-agnostic. Vanilla JS, zero dependencies. It builds its own DOM and
   injects its own (namespaced) CSS into a container you give it, so it drops into
   plain HTML, Next.js (call from a ref/useEffect), Vue (onMounted), a server-
   rendered page, anything.

   USAGE
     mountLetsScroll(document.getElementById('world'), {
       brand: { name: 'Pearl & Co.', href: '#top' },
        diveScroll: 1.3,   // viewport-heights of scroll per dive clip
        connScroll: 0.9,   // ...per connector clip
        connectorPlaybackRate: 2, // optional connector autoplay rate (0.25..4; default 1)
        connectorHandoffProgress: 0.2, // optional next-dive landing progress (0..0.45; default 0)
                                      // >0 hands back control as the next stage's copy appears;
                                      // 0 keeps the handoff at the connector's end.
        hint: 'scroll to fly in',
        onNavigate: href => router.push(href), // optional; validated local /products links only
        onPrefetch: href => router.prefetch(href), // optional hover/focus prefetch
       nav: true,         // show the top section nav
       atmosphere: true,  // subtle gradient + drifting particles behind the clips
       sections: [
         { id, label, still, stillMobile, clip, clipMobile, accent,
           scroll: 1.6,   // optional per-section override of diveScroll — more scroll
                          // distance = a slower, longer dwell in this scene
           linger: 0.5,   // optional 0..1 — remaps time so the camera settles mid-scene
                          // (exactly where the copy peaks) and moves quicker at the
                          // edges. 0 = linear (default). Keep ≤ 0.6; 1 = full pause.
           eyebrow, title, body, tags:[…],
           cta:{ primary:{label,href}, secondary:{label,href} } }, // last section only
         …
       ],
       connectors: [clipUrl, …],          // length = sections.length - 1 (nulls allowed)
       connectorsMobile: [clipUrl, …],    // optional lighter connectors for phones (same length)

   MOBILE (the clipMobile/connectorsMobile variants are the opt-in mobile version;
   the rest of the phone handling below is always on)
     The engine is phone-aware out of the box: on a coarse-pointer / ≤860px viewport it
       - loads `clipMobile` / `connectorsMobile` when provided (encode these smaller +
         tighter-GOP — seek cost on a phone decoder is dominated by frames-from-keyframe,
         so a 720p, -g 4 file scrubs far smoother than the 1080p desktop master; see
         pipeline.md). Falls back to the desktop `clip` if no mobile variant is given.
       - uses `stillMobile` as the scene poster when provided (pair it with native 9:16
         clipMobile renders so the poster matches the portrait video's first frame instead
         of flashing from a landscape crop). Chosen once at mount; a desktop resize into
         phone width keeps the desktop poster (clips still switch via isMobile()).
       - coalesces seeks (never issues a new currentTime while the decoder is still
         `seeking`) so fast flicks can't pile up and freeze the video.
       - keeps the still as a live poster until the clip actually paints its first frame,
         and primes each video (muted play→pause) on first touch — this is what stops iOS
         from showing a blank scene before the first seek.
       - drops the drifting particles and ignores URL-bar-only resizes (no scroll jump).
     Nothing here is required — a config with only `clip`/`connectors` still works on
     phones; the mobile variants just make it lighter and smoother.

   THEME (CSS custom properties; set on the container or :root to override)
     --sw-bg         page background (match your scene bg for seamless posters)
     --sw-ink        primary text
     --sw-ink-soft   secondary text
     --sw-accent     default accent (each section overrides via its `accent`)
     --sw-font-display / --sw-font-body

   REQUIREMENTS ON YOUR ASSETS
     - clips encoded native-res, crf~20, -g 8, +faststart, no audio (see pipeline.md)
     - connectors' endpoints are the neighbouring dives' ACTUAL frames (see SKILL Step 5)
     - (optional) mobile variants at ~720p, -g 4 for smoother phone scrubbing
   The engine loads each clip as a Blob (always seekable) and scrubs currentTime; it does
   NOT depend on HTTP byte-range support.
   ========================================================================== */

// The exit keyframes and delayed navigation share one clock.
const NAVIGATION_EXIT_MS = 560;

function mountLetsScroll(container, config) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Phone detection. `coarse` is captured once (input type doesn't change mid-session);
  // the ≤860px query is read live via isMobile() so a desktop resize/DevTools toggle
  // switches sources and seek behaviour without a reload.
  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const smallMQ = window.matchMedia('(max-width: 860px)');
  const isMobile = () => coarse || smallMQ.matches;
  const SECTIONS = config.sections || [];
  const CONNECTORS = config.connectors || [];
  const CONNECTORS_M = config.connectorsMobile || [];
  const DIVE_W = config.diveScroll || 1.3;
  const CONN_W = config.connScroll || 0.9;
  const CONNECTOR_PLAYBACK_RATE = Number.isFinite(config.connectorPlaybackRate) && config.connectorPlaybackRate > 0
    ? Math.min(4, Math.max(0.25, config.connectorPlaybackRate))
    : 1;
  const CONNECTOR_HANDOFF_PROGRESS = Number.isFinite(config.connectorHandoffProgress)
    ? Math.min(0.45, Math.max(0, config.connectorHandoffProgress))
    : 0;
  const CROSSFADE = (config.crossfade != null) ? config.crossfade : 0.12;  // seam dissolve width (vh)
  const N = SECTIONS.length;
  if (!N) return;

  injectCSS();
  container.classList.add('sw-root');

  // ---- build the interleaved segment chain: dive0, conn0, dive1, … diveN-1 ----
  const SEGMENTS = [];
  SECTIONS.forEach((s, i) => {
    const dive = { kind: 'dive', si: i, clip: s.clip, clipM: s.clipMobile, still: s.still, stillM: s.stillMobile,
                   accent: s.accent, w: s.scroll || DIVE_W, linger: s.linger || 0 };
    SEGMENTS.push(dive);
    s._seg = dive;
    // A connector is optional: if connectors[i] is falsy, the two dives simply
    // crossfade directly (no fly-over). Lets a page complete even when a
    // connector can't be generated (e.g. a content-filter false-positive).
    if (i < N - 1 && CONNECTORS[i]) {
      SEGMENTS.push({ kind: 'conn', si: i, clip: CONNECTORS[i], clipM: CONNECTORS_M[i],
                      still: SECTIONS[i + 1].still, stillM: SECTIONS[i + 1].stillMobile,
                      accent: SECTIONS[i + 1].accent, w: CONN_W });
    }
  });
  const NSEG = SEGMENTS.length;
  let destroyed = false;
  let navigationTimer = 0;
  let navigationRecoveryTimer = 0;
  let navigationPending = false;
  const navigationBindings = [];
  const prefetchedProducts = new Set();
  const loadControllers = new Set();
  const theme = config.theme || {};
  if (theme.bg) container.style.setProperty('--sw-bg', theme.bg);
  if (theme.ink) container.style.setProperty('--sw-ink', theme.ink);
  if (theme.inkSoft) container.style.setProperty('--sw-ink-soft', theme.inkSoft);
  if (theme.accent) container.style.setProperty('--sw-accent', theme.accent);
  // Three slots cover the active scene, its transition neighbour, and a small
  // directional prefetch window without retaining the whole camera flight.
  const MAX_LOADED_CLIPS = 3;
  const FRAME_BUDGET_MS = 6;

  // ---- DOM ----
  const sky = el('div', 'sw-sky');
  if (config.atmosphere !== false) {
    sky.appendChild(el('div', 'sw-sky__grad'));
    sky.appendChild(el('div', 'sw-sky__glow'));
  }
  const particles = el('div', 'sw-particles'); sky.appendChild(particles);

  const scrollbar = el('div', 'sw-scrollbar');
  const scrollbarFill = el('span'); scrollbar.appendChild(scrollbarFill);

  const topbar = el('div', 'sw-topbar');
  if (config.brand) {
    const brand = el('a', 'sw-brand'); brand.href = (config.brand.href || '#');
    const logoUrl = String(config.brand.logoUrl || '').trim();
    if (logoUrl) {
      const logo = el('img', 'sw-brand__logo');
      logo.src = logoUrl;
      logo.alt = '';
      logo.setAttribute('aria-hidden', 'true');
      logo.decoding = 'async';
      brand.appendChild(logo);
    } else {
      brand.appendChild(el('span', 'sw-brand__mark'));
    }
    const brandCopy = el('span', 'sw-brand__copy');
    const nm = el('span', 'sw-brand__name'); nm.textContent = config.brand.name || ''; brandCopy.appendChild(nm);
    const description = String(config.brand.description || '').trim();
    if (description) {
      const desc = el('span', 'sw-brand__description'); desc.textContent = description; brandCopy.appendChild(desc);
      brand.title = description;
    }
    brand.appendChild(brandCopy);
    topbar.appendChild(brand);
  }
  const nav = el('nav', 'sw-nav'); if (config.nav !== false) topbar.appendChild(nav);
  if (config.cta && config.cta.label) {
    const c = el('a', 'sw-topcta sw-zoom-link'); c.href = config.cta.href || '#';
    const label = el('span'); label.textContent = config.cta.label;
    const arrow = el('span', 'sw-topcta__arrow'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    c.appendChild(label); c.appendChild(arrow);
    bindZoomLink(c);
    topbar.appendChild(c);
  }
  const navigationStatus = el('span', 'sw-navigation-status');
  navigationStatus.setAttribute('role', 'status');
  navigationStatus.setAttribute('aria-live', 'polite');
  topbar.appendChild(navigationStatus);

  const stage = el('div', 'sw-stage');
  const copylayer = el('div', 'sw-copylayer');
  const route = el('div', 'sw-route');
  const hint = el('div', 'sw-hint');
  const hintText = el('span'); hintText.textContent = config.hint || 'scroll'; hint.appendChild(hintText);
  hint.appendChild(el('i'));
  const track = el('div', 'sw-track');

  [sky, scrollbar, topbar, stage, copylayer, route, hint, track].forEach(n => container.appendChild(n));

  // segment scenes
  SEGMENTS.forEach(s => {
    const scene = el('div', 'sw-scene'); scene.style.setProperty('--sw-accent', s.accent || '');
    const img = el('img', 'sw-scene__still'); img.alt = ''; img.decoding = 'async'; img.loading = 'lazy';
    const poster = (isMobile() && s.stillM) ? s.stillM : s.still;
    if (poster) img.src = poster;
    scene.appendChild(img); stage.appendChild(scene);
    s.el = scene; s.img = img; s.video = null; s.hasClip = false;
    s.loading = false; s.ready = false; s.cur = 0; s.target = 0; s.visible = false;
    s.loadToken = null; s.loadController = null; s.sourceUrl = '';
    s.objectUrl = ''; s.videoListeners = []; s.hasPainted = false;
    s.autoPlaying = false; s.autoPlayCompleted = false;
  });

  // per-section copy / route / nav
  const copies = [], dots = [];
  SECTIONS.forEach((s, i) => {
    const c = el('article', 'sw-copy'); c.style.setProperty('--sw-accent', s.accent || '');
    c.inert = true;
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML =
      `<span class="sw-copy__num">${pad(i + 1)} / ${pad(N)}</span>` +
      (s.eyebrow ? `<span class="sw-copy__eyebrow">${esc(s.eyebrow)}</span>` : '') +
      (s.title ? `<h2 class="sw-copy__title">${esc(s.title)}</h2>` : '') +
      (s.body ? `<p class="sw-copy__body">${esc(s.body)}</p>` : '') +
      (s.tags && s.tags.length ? `<ul class="sw-copy__tags">${s.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '') +
      (s.cta ? `<div class="sw-copy__cta">${ctaBtns(s.cta)}</div>` : '');
    copylayer.appendChild(c); copies.push(c);
    c.querySelectorAll('.sw-zoom-link').forEach(bindZoomLink);

    const dot = el('button', 'sw-route__dot'); dot.style.setProperty('--sw-accent', s.accent || '');
    dot.innerHTML = `<span class="sw-route__label">${esc(s.label || '')}</span><i></i>`;
    dot.addEventListener('click', () => jumpTo(i)); route.appendChild(dot); dots.push(dot);

    if (config.nav !== false) {
      const b = el('button', 'sw-nav__item'); b.textContent = s.label || '';
      b.addEventListener('click', () => jumpTo(i)); nav.appendChild(b);
    }
  });

  // ---- math ----
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  // Per-section dwell: monotone remap of scroll→time so the camera settles mid-scene
  // (where the copy peaks) and moves quicker near the seams. L=0 linear, L=1 full
  // mid-scene pause. f(0)=0, f(1)=1 always, so seam frames are untouched.
  const lingerEase = (x, L) => { L = clamp(L); const c = x - 0.5; return (1 - L) * x + L * (4 * c * c * c + 0.5); };
  const inverseLingerEase = (time, L) => {
    time = clamp(time);
    if (!L || time === 0 || time === 1) return time;
    let low = 0, high = 1;
    // Bisection also works at L=1, where the monotone curve is flat at its centre.
    for (let i = 0; i < 32; i++) {
      const mid = (low + high) / 2;
      if (lingerEase(mid, L) < time) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  };
  let vh = window.innerHeight, stageX = 0, totalW = 0, activeIndex = -1;
  let laidOutW = window.innerWidth;   // width the current layout was computed at (see onResize)
  let lastCi = -1, lastCopyIndex = -1;
  let lastMobile = isMobile();
  let lastPrefetchDirection = 1;
  let lastFrameY = 0, lastFrameTime = 0, scrollVelocity = 0, hasFrameSample = false;
  let pendingScrollY = null, layoutDirty = true;
  let renderedIndices = new Set();
  let frameId = 0, frameQueued = false;
  let connectorPlayback = null;
  let connectorCandidate = -1;
  const completedConnectors = new Set();
  let navigationTarget = -1;

  function layout() {
    if (destroyed) return;
    vh = window.innerHeight;
    laidOutW = window.innerWidth;
    stageX = window.innerWidth > 860 ? 4 : 0;
    let off = 0;
    SEGMENTS.forEach(s => { s.start = off * vh; off += s.w; s.end = off * vh; });
    totalW = off;
    track.style.height = (totalW * vh + vh) + 'px';   // +1vh so the last flight completes
    layoutDirty = true;
    scheduleFrame();
  }

  function jumpTo(i) {
    if (destroyed || navigationPending || !SECTIONS[i]) return;
    cancelConnectorPlayback(false);
    connectorCandidate = -1;
    navigationTarget = i;
    const seg = SECTIONS[i]._seg;
    window.scrollTo({ top: seg.start + (seg.end - seg.start) * 0.5, behavior: reduce ? 'instant' : 'smooth' });
  }

  function scrollInstant(top) {
    const root = document.documentElement;
    const body = document.body;
    const rootBehavior = root?.style?.scrollBehavior ?? '';
    const bodyBehavior = body?.style?.scrollBehavior ?? '';
    if (root?.style) root.style.scrollBehavior = 'auto';
    if (body?.style) body.style.scrollBehavior = 'auto';
    try {
      window.scrollTo(0, top);
    } finally {
      if (root?.style) root.style.scrollBehavior = rootBehavior;
      if (body?.style) body.style.scrollBehavior = bodyBehavior;
    }
  }

  // Product CTAs get a short cinematic exit, while every other link keeps the
  // browser's normal navigation semantics. The binding is per generated node
  // and is removed during cleanup so repeat mounts never stack handlers.
  function bindZoomLink(link) {
    if (!link || link.__swZoomNavigationHandler) return;
    const handler = event => {
      if (!canZoomNavigate(link, event)) return;
      const href = productsHref(link);
      if (!href) return;
      event.preventDefault();
      if (navigationPending) return;
      navigationPending = true;
      cancelConnectorPlayback(false);
      if (frameQueued) cancelAnimationFrame(frameId);
      frameQueued = false;
      frameId = 0;
      SEGMENTS.forEach(s => { if (s.video) s.video.pause(); });
      link.setAttribute('aria-busy', 'true');
      navigationStatus.textContent = 'Opening the cake collection…';
      prefetch();
      // Do not strand the page in its exit state if client navigation fails.
      // This restores the controls; it never silently retries the navigation.
      navigationRecoveryTimer = setTimeout(() => {
        resetNavigation();
        navigationStatus.textContent = 'The collection has not opened yet. Please try Order now again.';
      }, 3200);
      const reduceNow = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceNow || event.detail === 0) {
        navigateTo(href);
        return;
      }
      container.classList.add('is-navigating');
      navigationTimer = setTimeout(() => {
        navigationTimer = 0;
        if (!destroyed) navigateTo(href);
      }, NAVIGATION_EXIT_MS);
    };
    const prefetch = () => {
      const href = productsHref(link);
      if (destroyed || !href || prefetchedProducts.has(href) || typeof config.onPrefetch !== 'function') return;
      try { config.onPrefetch(href); prefetchedProducts.add(href); } catch { /* Navigation still works without prefetch. */ }
    };
    link.__swZoomNavigationHandler = handler;
    link.addEventListener('click', handler);
    link.addEventListener('pointerenter', prefetch);
    link.addEventListener('focus', prefetch);
    navigationBindings.push({ link, handler, prefetch });
  }

  function canZoomNavigate(link, event) {
    if (destroyed || !event || event.defaultPrevented) return false;
    // Keyboard activation navigates immediately; modified/middle clicks retain
    // native new-tab behavior and downloads are never intercepted.
    if (event.button != null && event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    return !link.getAttribute('target') && !link.hasAttribute('download');
  }

  function productsHref(link) {
    const rawHref = (typeof link.getAttribute === 'function' && link.getAttribute('href')) || link.href;
    const location = window.location;
    const URLCtor = (typeof window.URL === 'function' && window.URL)
      || (typeof URL === 'function' && URL);
    if (!rawHref || !location || !location.href || !URLCtor) return '';
    try {
      const target = new URLCtor(rawHref, location.href);
      const current = new URLCtor(location.href);
      const productsPath = target.pathname === '/products' || target.pathname.startsWith('/products/');
      return target.origin === current.origin && productsPath && /^https?:$/.test(target.protocol)
        ? target.pathname + target.search + target.hash : '';
    } catch {
      return '';
    }
  }

  function navigateTo(href) {
    if (destroyed) return;
    try {
      if (typeof config.onNavigate === 'function') config.onNavigate(href);
      else window.location.assign(href);
    } catch {
      resetNavigation();
      navigationStatus.textContent = 'The collection could not open. Please try Order now again.';
    }
  }

  function resetNavigation() {
    if (navigationTimer) clearTimeout(navigationTimer);
    if (navigationRecoveryTimer) clearTimeout(navigationRecoveryTimer);
    navigationTimer = 0;
    navigationRecoveryTimer = 0;
    navigationPending = false;
    container.classList.remove('is-navigating');
    navigationBindings.forEach(({ link }) => link.removeAttribute('aria-busy'));
    navigationStatus.textContent = '';
    scheduleFrame();
  }
  // A native fallback can return through the browser's back/forward cache.
  function onPageShow(event) {
    if (event.persisted) resetNavigation();
  }
  window.addEventListener('pageshow', onPageShow);

  function connectorBetween(from, to) {
    if (to <= from) return -1;
    for (let i = Math.max(0, from + 1); i <= Math.min(to, NSEG - 1); i++) {
      if (SEGMENTS[i].kind === 'conn') return i;
    }
    return -1;
  }

  function connectorReplayReleaseY(segment, fade) {
    const next = SEGMENTS[SEGMENTS.indexOf(segment) + 1];
    // A handoff can land beyond the connector's seam fade. Keep the completed
    // latch through the next dive's opening, until the user moves clearly in.
    return next
      ? Math.max((segment.handoffY || segment.end) + fade, next.start + (next.end - next.start) * 0.45)
      : segment.end + fade;
  }

  function playbackOwnsSegment(s) {
    return !!connectorPlayback && (connectorPlayback.segment === s || connectorPlayback.next === s);
  }

  function setPlaybackScroll(playback, y) {
    playback.lockY = y;
    scrollVelocity = 0;
    pendingScrollY = y;
    lastFrameY = y;
    lastFrameTime = performance.now();
    hasFrameSample = true;
    if ((window.scrollY || window.pageYOffset || 0) !== y) scrollInstant(y);
  }

  function clearPlaybackMedia(playback) {
    if (playback.timer) clearTimeout(playback.timer);
    if (playback.startupTimer) clearTimeout(playback.startupTimer);
    playback.timer = playback.startupTimer = 0;
    playback.listeners.forEach(({ video, type, listener }) => video.removeEventListener(type, listener));
    playback.listeners = [];
    try { playback.video?.pause(); } catch {}
    playback.video = null;
    playback.started = playback.playRequested = false;
  }

  function syncOpeningPlayback(playback) {
    const s = playback.next, v = playback.video;
    const progress = clamp(v.currentTime / v.duration);
    s.cur = s.target = progress;
    setPlaybackScroll(playback, s.start + (s.end - s.start) * inverseLingerEase(progress, s.linger));
  }

  function cancelConnectorPlayback(completed) {
    const playback = connectorPlayback;
    if (!playback) return;
    // Pause at the actual played frame, including a possible one-frame overshoot.
    // Seeking back to the configured threshold here would visibly rewind the dive.
    try { playback.video?.pause(); } catch {}
    if (completed && !destroyed && !navigationPending) {
      if (playback.phase === 'intro') syncOpeningPlayback(playback);
      else setPlaybackScroll(playback, playback.segment.end);
      playback.segment.handoffY = playback.lockY;
      lastCi = findSegment(playback.lockY);
    } else if (!destroyed) {
      pendingScrollY = window.scrollY || window.pageYOffset || 0;
    }
    clearPlaybackMedia(playback);
    playback.segment.autoPlaying = false;
    if (playback.next) playback.next.autoPlaying = false;
    connectorPlayback = null;
    connectorCandidate = -1;
    // Ownership changes also change the three-clip prefetch window.
    layoutDirty = true;
    scheduleFrame();
  }

  function finishConnector(playback) {
    const s = playback.segment;
    // Only a native ended event latches completion. A watchdog never pretends
    // the connector or the next opening played successfully.
    completedConnectors.add(s);
    s.autoPlaying = false;
    s.autoPlayCompleted = true;
    s.cur = s.target = 1;
    s.handoffY = s.end;
    if (!playback.next) {
      cancelConnectorPlayback(true);
      return;
    }
    clearPlaybackMedia(playback);
    playback.phase = 'waiting';
    playback.startupTimer = setTimeout(() => {
      if (connectorPlayback === playback) cancelConnectorPlayback(false);
    }, 4000);
    // Leave the connector's final frame on screen while fetch/data/reset catches up.
    layoutDirty = true;
    prepareConnectorPlayback();
    scheduleFrame();
  }

  function prepareConnectorPlayback() {
    const playback = connectorPlayback;
    if (!playback || destroyed || navigationPending || playback.playRequested) return;
    const s = playback.phase === 'connector' ? playback.segment : playback.next;
    const v = s.video;
    if (!clipUrl(s)) { cancelConnectorPlayback(false); return; }
    if (!v) return;
    const current = () => connectorPlayback === playback && playback.video === v && s.video === v && !destroyed && !navigationPending;
    if (!playback.video) {
      playback.video = v;
      const listen = (type, listener) => {
        v.addEventListener(type, listener);
        playback.listeners.push({ video: v, type, listener });
      };
      const onStarted = () => {
        if (!current() || !playback.playRequested || playback.started) return;
        playback.started = true;
        if (playback.startupTimer) clearTimeout(playback.startupTimer);
        playback.startupTimer = 0;
        const opening = s === playback.next;
        if (opening) {
          playback.phase = 'intro';
          syncOpeningPlayback(playback);
          layoutDirty = true;
        }
        const endpoint = opening ? lingerEase(CONNECTOR_HANDOFF_PROGRESS, s.linger) * v.duration : v.duration;
        playback.timer = setTimeout(() => {
          if (current()) cancelConnectorPlayback(false);
        }, Math.max(0, endpoint - v.currentTime) / CONNECTOR_PLAYBACK_RATE * 1000 + 700);
        scheduleFrame();
      };
      playback.onStarted = onStarted;
      listen('playing', onStarted);
      listen('ended', () => {
        if (!current() || !playback.started) return;
        if (playback.phase === 'connector') finishConnector(playback);
        else updateOpeningPlayback();
      });
      listen('error', () => { if (current()) cancelConnectorPlayback(false); });
      listen('timeupdate', () => {
        if (!current() || playback.phase !== 'intro') return;
        updateOpeningPlayback();
        scheduleFrame();
      });
      v.loop = false;
      v.playbackRate = CONNECTOR_PLAYBACK_RATE;
      try { v.pause(); } catch {}
    }
    // Metadata alone cannot paint an opening. Wait for data and for any old
    // scrub/priming seek to settle, then reset and await that seek as well.
    if (!s.ready || v.readyState < 2 || !Number.isFinite(v.duration) || v.duration <= 0 || v.seeking) return;
    if (v.currentTime !== 0) {
      try { v.currentTime = 0; } catch { cancelConnectorPlayback(false); return; }
      if (v.seeking || v.currentTime !== 0) return;
    }
    if (!current() || playback.playRequested) return;
    playback.playRequested = true;
    try {
      const promise = v.play();
      if (promise && promise.then) promise.then(playback.onStarted).catch(() => {
        if (current()) cancelConnectorPlayback(false);
      });
      else playback.onStarted();
    } catch {
      if (current()) cancelConnectorPlayback(false);
    }
  }

  function updateOpeningPlayback() {
    const playback = connectorPlayback;
    if (!playback || playback.phase !== 'intro' || !playback.started || destroyed || navigationPending) return;
    syncOpeningPlayback(playback);
    if (playback.video.currentTime >= lingerEase(CONNECTOR_HANDOFF_PROGRESS, playback.next.linger) * playback.video.duration) {
      cancelConnectorPlayback(true);
    }
  }

  function maybeStartConnectorPlayback() {
    if (reduce || destroyed || navigationPending || connectorPlayback || navigationTarget >= 0 || connectorCandidate < 0) return;
    const s = SEGMENTS[connectorCandidate];
    if (!s || s.kind !== 'conn' || !s.video || !s.ready) return;
    if (completedConnectors.has(s)) {
      connectorCandidate = -1;
      return;
    }
    const next = CONNECTOR_HANDOFF_PROGRESS > 0 ? SEGMENTS[connectorCandidate + 1] : null;
    const playback = {
      segment: s, next, video: null, phase: 'connector', lockY: s.start,
      timer: 0, startupTimer: 0, started: false, playRequested: false, listeners: [],
    };
    connectorPlayback = playback;
    connectorCandidate = -1;
    s.autoPlaying = true;
    s.autoPlayCompleted = false;
    // Reserve the next dive even before its video exists. Neither first-touch
    // priming, late loadeddata nor normal scrub may take this media ownership.
    if (next) {
      next.autoPlaying = true;
      try { next.video?.pause(); } catch {}
    }
    setPlaybackScroll(playback, s.start);
    playback.startupTimer = setTimeout(() => {
      if (connectorPlayback === playback) cancelConnectorPlayback(false);
    }, 1200);
    prepareConnectorPlayback();
  }

  function clipUrl(s) {
    return (isMobile() && s.clipM) ? s.clipM : s.clip;
  }

  function scheduleFrame() {
    if (destroyed || navigationPending || frameQueued) return;
    frameQueued = true;
    frameId = requestAnimationFrame(frame);
  }

  function removeVideo(s) {
    if (playbackOwnsSegment(s)) cancelConnectorPlayback(false);
    if (!s.video) return;
    const v = s.video;
    s.videoListeners.forEach(({ type, listener, options }) => v.removeEventListener(type, listener, options));
    s.videoListeners = [];
    try { v.pause(); } catch {}
    v.removeAttribute('src');
    try { v.load(); } catch {}
    if (v.parentNode === s.el) s.el.removeChild(v);
    s.video = null;
    s.ready = false;
    s.hasClip = false;
    s.hasPainted = false;
    s.el.classList.remove('has-clip');
    if (s.objectUrl) {
      URL.revokeObjectURL(s.objectUrl);
      s.objectUrl = '';
    }
  }

  function releaseClip(s) {
    if (playbackOwnsSegment(s)) cancelConnectorPlayback(false);
    if (s.loadController) s.loadController.abort();
    s.loadController = null;
    s.loadToken = null;
    s.loading = false;
    s.sourceUrl = '';
    removeVideo(s);
    s.cur = s.target;
  }

  function loadClip(s) {
    // Under prefers-reduced-motion we never load the clips at all — the stills stay up
    // and simply cross-dissolve as you scroll. No scrubbed video motion, no decode cost.
    if (reduce || s.loading || s.hasClip || !s.clip) return;
    const url = clipUrl(s);
    if (!url) return;
    s.loading = true;
    s.sourceUrl = url;
    const controller = new AbortController();
    const token = {};
    s.loadController = controller;
    s.loadToken = token;
    loadControllers.add(controller);

    fetch(url, { signal: controller.signal }).then(r => r.ok ? r.blob() : Promise.reject(new Error('404')))
      .then(blob => {
        // A clip can be evicted while its fetch is in flight. Never attach a stale
        // response after a source switch, a far jump, or component cleanup.
        if (destroyed || controller.signal.aborted || s.loadToken !== token) return;
        const v = document.createElement('video');
        v.className = 'sw-scene__video';
        v.muted = true; v.playsInline = true; v.preload = 'auto';
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        const objectUrl = URL.createObjectURL(blob);
        const listen = (type, listener, options) => {
          v.addEventListener(type, listener, options);
          s.videoListeners.push({ type, listener, options });
        };
        const valid = () => !destroyed && s.loadToken === token && s.video === v;
        const onMetadata = () => {
          if (!valid()) return;
          s.ready = true;
          s.cur = s.target;
          scheduleFrame();
        };
        const onSeeked = () => {
          if (!valid()) return;
          if (!s.hasPainted) {
            s.hasPainted = true;
            s.el.classList.add('has-clip');
          }
          scheduleFrame();
        };
        const onPlaying = () => {
          if (!valid() || s.hasPainted) return;
          s.hasPainted = true;
          s.el.classList.add('has-clip');
        };
        const onLoadedData = () => {
          if (!valid()) return;
          if (connectorOwnsVideo(s, v)) { scheduleFrame(); return; }
          try { v.pause(); } catch {}
          if (userReady) primeVideo(s, v);
        };
        const onError = () => {
          if (!valid()) return;
          s.loadToken = null;
          s.sourceUrl = '';
          s.loading = false;
          removeVideo(s);
          scheduleFrame();
        };
        listen('loadedmetadata', onMetadata);
        listen('seeked', onSeeked);
        listen('playing', onPlaying);
        listen('loadeddata', onLoadedData);
        listen('error', onError);
        v.src = objectUrl;
        s.el.appendChild(v);
        s.video = v;
        s.objectUrl = objectUrl;
        s.hasClip = true;
        s.loading = false;
        s.loadController = null;
        s.cur = s.target;
        scheduleFrame();
      }).catch(() => {
        if (s.loadToken !== token) return;
        s.loading = false;
        s.loadController = null;
        s.loadToken = null;
        s.sourceUrl = '';
        if (playbackOwnsSegment(s)) cancelConnectorPlayback(false);
      }).finally(() => {
        loadControllers.delete(controller);
        if (s.loadToken === token && !s.hasClip) {
          s.loading = false;
          s.loadController = null;
        }
      });
  }

  function findSegment(y) {
    let low = 0, high = NSEG - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (y >= SEGMENTS[mid].start) low = mid;
      else high = mid - 1;
    }
    return low;
  }

  function refreshClipBudget(ci) {
    const direction = Math.abs(scrollVelocity) > 0.03 ? (scrollVelocity < 0 ? -1 : 1) : lastPrefetchDirection;
    const order = [];
    const add = index => {
      if (index >= 0 && index < NSEG && !order.includes(index)) order.push(index);
    };
    if (connectorPlayback) {
      add(SEGMENTS.indexOf(connectorPlayback.segment));
      add(SEGMENTS.indexOf(connectorPlayback.next));
    }
    add(ci);
    add(connectorCandidate);
    add(ci + direction);
    add(ci - direction);
    add(ci + direction * 2);
    add(ci - direction * 2);
    const retained = new Set(order.slice(0, MAX_LOADED_CLIPS));

    SEGMENTS.forEach((s, i) => {
      const url = clipUrl(s);
      if (!retained.has(i) || ((s.hasClip || s.loading) && s.sourceUrl !== url)) releaseClip(s);
    });
    order.slice(0, MAX_LOADED_CLIPS).forEach(i => loadClip(SEGMENTS[i]));
    lastPrefetchDirection = direction;
  }

  function updateCopy(i, y) {
    if (i < 0 || i >= N) return;
    const seg = SECTIONS[i]._seg;
    const range = Math.max(seg.end - seg.start, 1);
    const pr = clamp((y - seg.start) / range, 0, 1);
    const before = y < seg.start, after = y > seg.end;
    // Arrive at readable text, then give it a quiet reading plateau. Previously
    // a handoff at 18% froze middle-stage copy at only ~30% opacity.
    const revealEnd = CONNECTOR_HANDOFF_PROGRESS > 0 ? CONNECTOR_HANDOFF_PROGRESS : 0.18;
    const opening = i === 0 ? 1 : smooth(pr / revealEnd);
    const closing = i === N - 1 ? 1 : 1 - smooth((pr - 0.58) / 0.34);
    const cop = before || (after && i !== N - 1) ? 0 : opening * closing;
    const c = copies[i];
    c.style.opacity = cop;
    // CSS owns the stable upper-third layout. Animate only a small additive
    // offset so a longer heading cannot drift toward the bottom of the screen.
    const drift = reduce ? 0 : (pr > 0.5 ? -1 : 1) * (1 - cop) * 16;
    c.style.setProperty('--sw-copy-offset', `${drift.toFixed(2).replace(/\.00$/, '')}px`);
    const readable = cop > 0.5;
    c.style.pointerEvents = readable ? 'auto' : 'none';
    c.inert = !readable;
    c.setAttribute('aria-hidden', String(!readable));
  }

  function read(y, velocity) {
    if (destroyed || navigationPending || !NSEG) return;
    const requestedY = Number.isFinite(y) ? Math.max(0, y) : 0;
    const safeY = connectorPlayback ? connectorPlayback.lockY : requestedY;
    const fade = Math.max(CROSSFADE * vh, 1);
    completedConnectors.forEach((segment) => {
      if (safeY < segment.start - fade || safeY > connectorReplayReleaseY(segment, fade)) {
        completedConnectors.delete(segment);
        segment.autoPlayCompleted = false;
      }
    });
    const ci = findSegment(safeY);
    const cur = SEGMENTS[ci];
    const curRange = Math.max(cur.end - cur.start, 1);
    const near = clamp(cur.kind === 'dive' ? cur.si
      : (((safeY - cur.start) / curRange) > 0.5 ? cur.si + 1 : cur.si), 0, N - 1);
    const mobileNow = isMobile();
    let mediaChanged = false;
    if (mobileNow !== lastMobile) {
      lastMobile = mobileNow;
      mediaChanged = true;
      SEGMENTS.forEach(s => { if (s.video || s.loading) releaseClip(s); });
    }

    const visibleIndices = new Set([ci]);
    for (let i = ci - 1; i >= 0 && safeY < SEGMENTS[i].end + fade; i--) visibleIndices.add(i);
    for (let i = ci + 1; i < NSEG && safeY > SEGMENTS[i].start - fade; i++) visibleIndices.add(i);
    const touched = new Set([...renderedIndices, ...visibleIndices]);

    touched.forEach(i => {
      const s = SEGMENTS[i];
      const isVisible = visibleIndices.has(i);
      const local = clamp((safeY - s.start) / Math.max(s.end - s.start, 1), 0, 1);
      const targetLocal = local;
      s.target = s.linger ? lingerEase(targetLocal, s.linger) : targetLocal;
      let outside = 0;
      if (safeY < s.start) outside = s.start - safeY;
      else if (safeY > s.end) outside = safeY - s.end;
      // The matching connector frame remains visible until the next video has
      // data, has reset to zero and has actually started native playback.
      const awaitingOpening = connectorPlayback && connectorPlayback.next === s && connectorPlayback.phase !== 'intro';
      const op = awaitingOpening ? 0 : smooth(clamp(1 - outside / fade));
      s.el.style.opacity = op;
      s.visible = isVisible && op > 0.001;
      s.el.style.zIndex = (i === ci) ? '120' : String(100 + Math.round(op * 10));
      if (!s.hasClip || !s.ready) {
        const sc = reduce ? 1 : 1.03 + local * 0.14;
        s.img.style.transform = `translateX(${stageX - 2}vw) scale(${sc.toFixed(3)})`;
      }
    });
    renderedIndices = visibleIndices;

    if (near !== lastCopyIndex) {
      updateCopy(lastCopyIndex, safeY);
      lastCopyIndex = near;
    }
    updateCopy(near, safeY);

    if (near !== activeIndex) {
      activeIndex = near;
      dots.forEach((d, k) => d.classList.toggle('is-active', k === near));
      nav.querySelectorAll('.sw-nav__item').forEach((n, k) => n.classList.toggle('is-active', k === near));
      container.style.setProperty('--sw-accent', SECTIONS[near].accent || '');
    }

    const destinationReached = navigationTarget >= 0 && cur === SECTIONS[navigationTarget]._seg;
    const crossed = lastCi >= 0 ? connectorBetween(lastCi, ci) : -1;
    if (!reduce && !connectorPlayback && navigationTarget < 0) {
      if (velocity < -0.01) connectorCandidate = -1;
      else if (crossed >= 0 && !completedConnectors.has(SEGMENTS[crossed])) connectorCandidate = crossed;
      else if (cur.kind === 'conn' && lastCi !== ci && velocity > 0.01 && !completedConnectors.has(cur)) connectorCandidate = ci;
      else if (connectorCandidate >= 0 && requestedY > SEGMENTS[connectorCandidate].end + vh) connectorCandidate = -1;
    } else if (navigationTarget >= 0) {
      connectorCandidate = -1;
    }
    // Keep navigation suppression active for the read that reaches the target;
    // otherwise a long programmatic jump can nominate an earlier connector
    // from the whole traversed range on arrival.
    if (destinationReached) navigationTarget = -1;

    const direction = Math.abs(velocity) > 0.03 ? (velocity < 0 ? -1 : 1) : lastPrefetchDirection;
    if (ci !== lastCi || direction !== lastPrefetchDirection || layoutDirty || mediaChanged) refreshClipBudget(ci);
    maybeStartConnectorPlayback();
    if (connectorPlayback && connectorPlayback.lockY !== safeY) {
      // A fast wheel flick may already have reached the next scene when the
      // connector claims it. Paint the locked scene in this frame as well.
      read(connectorPlayback.lockY, 0);
      return;
    }
    lastCi = ci;
    layoutDirty = false;
    const scrollRange = Math.max(totalW * vh, 1);
    scrollbarFill.style.transform = `scaleX(${clamp(safeY / scrollRange)})`;
    hint.style.opacity = clamp(1 - safeY / Math.max(0.5 * vh, 1));
    if (particles) particles.style.transform = `translate3d(0, ${-safeY * 0.05}px, 0)`;
  }

  function scrub() {
    if (destroyed) return false;
    const started = performance.now();
    const eps = isMobile() ? 0.02 : 0.008;   // coarser seek step on phones = fewer decodes
    let animating = false, processed = 0;
    const indices = [...renderedIndices].sort((a, b) => (a === lastCi ? -1 : b === lastCi ? 1 : a - b));
    for (const i of indices) {
      if (processed && performance.now() - started > FRAME_BUDGET_MS) {
        animating = true;
        break;
      }
      const s = SEGMENTS[i];
      if (!s.visible || playbackOwnsSegment(s) || s.autoPlaying || s.autoPlayCompleted || !s.hasClip || !s.ready || !s.video) continue;
      processed++;
      // Never queue a seek while the decoder is still resolving the last one.
      // The seeked listener schedules the next frame with the latest target.
      if (s.video.seeking) continue;
      // Keep the frame a direct function of scroll position. A variable lerp
      // makes a fast wheel flick overshoot, then visibly catch up after the
      // gesture ends; the decoder already provides the useful coalescing here.
      s.cur = s.target;
      const dur = s.video.duration || 1;
      const t = clamp(s.cur, 0, 0.999) * dur;
      if (Math.abs(s.video.currentTime - t) > eps) { try { s.video.currentTime = t; } catch {} }
    }
    return animating;
  }

  function frame(now) {
    frameQueued = false;
    frameId = 0;
    if (destroyed) return;
    prepareConnectorPlayback();
    updateOpeningPlayback();
    const time = Number.isFinite(now) ? now : performance.now();
    const y = pendingScrollY == null ? (window.scrollY || window.pageYOffset || 0) : pendingScrollY;
    const dt = hasFrameSample ? Math.max(1, time - lastFrameTime) : 16;
    const moved = hasFrameSample && y !== lastFrameY;
    if (moved) {
      const measured = (y - lastFrameY) / dt;
      scrollVelocity = scrollVelocity * 0.35 + measured * 0.65;
    } else {
      scrollVelocity *= Math.exp(-dt / 120);
      if (Math.abs(scrollVelocity) < 0.001) scrollVelocity = 0;
    }
    pendingScrollY = null;
    lastFrameY = y;
    lastFrameTime = time;
    hasFrameSample = true;
    read(y, scrollVelocity);
    const animating = scrub();
    if (animating || pendingScrollY !== null || connectorPlayback?.phase === 'intro') scheduleFrame();
  }

  // iOS needs a user gesture before a muted video will decode/paint reliably. On the
  // first touch we prime every loaded clip (muted play→pause) so the first seek is
  // instant instead of showing a blank frame. `userReady` also makes freshly-loaded
  // clips prime themselves (see loadClip).
  let userReady = false;
  function connectorOwnsVideo(s, v) {
    return !!s && !!v && (
      s.autoPlaying ||
      s.autoPlayCompleted ||
      completedConnectors.has(s) ||
      (playbackOwnsSegment(s) && s.video === v)
    );
  }

  function primeVideo(s, v) {
    // Connectors have a deliberate one-shot playback path. Warming them with
    // play→pause as well creates a second visible start on mobile when the
    // connector finishes loading after the first touch.
    if (!isMobile() || destroyed || navigationPending || !s || s.kind === 'conn' || !v || s.video !== v || connectorOwnsVideo(s, v)) return;
    const token = s.loadToken;
    if (!token) return;
    const stillPriming = () => !destroyed && s.video === v && s.loadToken === token;
    const pauseIfStillOwned = () => {
      if (!stillPriming() || connectorOwnsVideo(s, v)) return;
      try { v.pause(); } catch {}
    };
    try {
      const p = v.play();
      if (p && p.then) p.then(pauseIfStillOwned).catch(() => {});
      else pauseIfStillOwned();
    } catch {}
  }
  function onFirstGesture() {
    if (userReady) return;
    userReady = true;
    SEGMENTS.forEach(s => primeVideo(s, s.video));
  }
  window.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true });
  window.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });

  // Particles are a per-frame cost we can't afford alongside video scrubbing on a phone.
  seedParticles(particles, reduce || coarse);
  function preventConnectorScroll(event) {
    if (connectorPlayback) event.preventDefault();
  }
  function onKeyDown(event) {
    if (!connectorPlayback) return;
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar'].includes(event.key)) {
      event.preventDefault();
    }
  }
  function onScroll() {
    const y = window.scrollY || window.pageYOffset || 0;
    if (connectorPlayback) {
      if (Math.abs(y - connectorPlayback.lockY) > 1) {
         scrollInstant(connectorPlayback.lockY);
      }
      pendingScrollY = connectorPlayback.lockY;
    } else {
      pendingScrollY = y;
    }
    scheduleFrame();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', preventConnectorScroll, { passive: false });
  window.addEventListener('touchmove', preventConnectorScroll, { passive: false });
  window.addEventListener('keydown', onKeyDown, { passive: false });
  // Mobile browsers fire `resize` every time the URL bar slides in/out. Re-running
  // layout() there rebuilds the track height and yanks the scroll position, so on
  // touch we ignore height-only changes and only relayout when the width actually
  // changes (rotation still comes through orientationchange). layout() records the
  // width it laid out at.
  function onResize() {
    if (coarse && window.innerWidth === laidOutW) return;
    layout();
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', layout);
  window.addEventListener('load', layout);
  layout();

  return function cleanup() {
    if (destroyed) return;
    destroyed = true;
    cancelConnectorPlayback(false);
    if (frameQueued) cancelAnimationFrame(frameId);
    frameQueued = false;
    frameId = 0;
    resetNavigation();
    navigationBindings.forEach(({ link, handler, prefetch }) => {
      link.removeEventListener('click', handler);
      link.removeEventListener('pointerenter', prefetch);
      link.removeEventListener('focus', prefetch);
      if (link.__swZoomNavigationHandler === handler) delete link.__swZoomNavigationHandler;
    });
    navigationBindings.length = 0;
    container.classList.remove('is-navigating');
    loadControllers.forEach(controller => controller.abort());
    loadControllers.clear();
    window.removeEventListener('pointerdown', onFirstGesture);
    window.removeEventListener('touchstart', onFirstGesture);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('wheel', preventConnectorScroll);
    window.removeEventListener('touchmove', preventConnectorScroll);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', layout);
    window.removeEventListener('load', layout);
    window.removeEventListener('pageshow', onPageShow);
    SEGMENTS.forEach(releaseClip);
    // The engine owns the container contents. Clearing it makes repeated
    // mount/unmount cycles (including React Strict Mode) idempotent.
    container.replaceChildren();
  };

  // ---- helpers ----
  function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function ctaBtns(cta) {
    let h = '';
    if (cta.primary) h += `<a class="sw-btn sw-btn--primary sw-zoom-link" href="${esc(cta.primary.href || '#')}">${esc(cta.primary.label)}</a>`;
    if (cta.secondary) h += `<a class="sw-btn sw-btn--ghost" href="${esc(cta.secondary.href || '#')}">${esc(cta.secondary.label)}</a>`;
    return h;
  }
}

function seedParticles(host, reduce) {
  if (!host || reduce) return;
  const kinds = ['dot', 'dot', 'ring'];
  const seeds = [7, 23, 41, 58, 71, 88, 12, 34, 52, 66, 83, 95, 18, 29, 47, 63, 77, 91, 5, 38, 55, 69, 82, 97];
  for (let k = 0; k < 20; k++) {
    const s = document.createElement('span');
    s.className = 'sw-pt sw-pt--' + kinds[k % kinds.length];
    s.style.left = seeds[k % seeds.length] + 'vw';
    s.style.top = ((seeds[(k * 3) % seeds.length] * 1.3) % 100) + 'vh';
    s.style.setProperty('--sw-sc', (0.5 + ((seeds[(k * 5) % seeds.length] % 60) / 60) * 1.1).toFixed(2));
    const dur = 14 + (seeds[(k * 7) % seeds.length] % 22);
    s.style.animationDuration = dur + 's';
    s.style.animationDelay = (-(seeds[(k * 2) % seeds.length] % dur)) + 's';
    host.appendChild(s);
  }
}

function injectCSS() {
  const css = `
  .sw-root{--sw-bg:#0a0a0a;--sw-ink:#f8f0ee;--sw-ink-soft:#aaa0a0;--sw-accent:#b76e79;
    --sw-font-display:"Iowan Old Style","Baskerville","Times New Roman",Georgia,serif;
    --sw-font-body:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif;
    isolation:isolate;color:var(--sw-ink);font-family:var(--sw-font-body);}
  html,body{margin:0;background:#0a0a0a;overflow-x:hidden;}
  .sw-sky{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:var(--sw-bg);}
  .sw-sky::after{content:"";position:absolute;inset:0;opacity:.055;mix-blend-mode:screen;background-image:repeating-linear-gradient(0deg,transparent 0,transparent 3px,rgba(255,255,255,.035) 4px,transparent 5px);}
  .sw-sky__grad{position:absolute;inset:-12%;transform:scale(1.08);background:linear-gradient(135deg,color-mix(in srgb,var(--sw-accent) 10%,var(--sw-bg)) 0%,var(--sw-bg) 38%,#050505 100%);}
  .sw-sky__glow{position:absolute;inset:0;background:radial-gradient(54% 44% at 78% 14%,color-mix(in srgb,var(--sw-accent) 15%,transparent),transparent 72%),linear-gradient(180deg,transparent 55%,rgba(0,0,0,.46) 100%);}
  .sw-particles{position:absolute;inset:-6% -2%;opacity:.72;}
  .sw-pt{position:absolute;width:11px;height:11px;transform:scale(var(--sw-sc,1));opacity:0;animation:sw-drift linear infinite;}
  .sw-pt::before{content:"";position:absolute;inset:0;border-radius:50%;}
  .sw-pt--dot::before{background:radial-gradient(circle at 34% 30%,color-mix(in srgb,#fff 44%,var(--sw-accent)),color-mix(in srgb,var(--sw-accent) 42%,#000) 74%,transparent 82%);}
  .sw-pt--ring::before{background:transparent;border:1px solid color-mix(in srgb,var(--sw-accent) 62%,transparent);box-shadow:0 0 14px color-mix(in srgb,var(--sw-accent) 22%,transparent);}
  @keyframes sw-drift{0%{opacity:0;transform:scale(var(--sw-sc)) translate(0,12vh) rotate(0)}12%{opacity:.5}88%{opacity:.45}100%{opacity:0;transform:scale(var(--sw-sc)) translate(4vw,-22vh) rotate(210deg)}}
  .sw-scrollbar{position:fixed;top:0;left:0;right:0;height:2px;z-index:60;background:rgba(255,255,255,.08);}
  .sw-scrollbar span{display:block;height:100%;width:100%;transform-origin:0 50%;transform:scaleX(0);background:linear-gradient(90deg,var(--sw-accent),#f1d1d2);box-shadow:0 0 16px color-mix(in srgb,var(--sw-accent) 70%,transparent);}
  .sw-topbar{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:clamp(16px,2.8vw,30px) clamp(18px,5vw,64px);}
  .sw-navigation-status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;}
  .sw-brand{display:flex;align-items:center;gap:10px;min-width:0;text-decoration:none;color:var(--sw-ink);}
  .sw-brand__mark{width:24px;height:28px;border-radius:7px 7px 10px 10px;background:linear-gradient(160deg,#e4b9bb,var(--sw-accent) 46%,#542e35);box-shadow:0 6px 18px color-mix(in srgb,var(--sw-accent) 42%,transparent),inset 0 1px rgba(255,255,255,.45);}
  .sw-brand__logo{width:28px;height:28px;object-fit:contain;border-radius:7px;}
  .sw-brand__copy{display:flex;min-width:0;flex-direction:column;}
  .sw-brand__name{font-family:var(--sw-font-display);font-weight:600;font-size:1.2rem;letter-spacing:.08em;}
  .sw-brand__description{max-width:24ch;margin-top:2px;overflow:hidden;color:var(--sw-ink-soft);font-size:.55rem;letter-spacing:.11em;line-height:1.2;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap;}
  .sw-nav{display:flex;gap:4px;padding:5px;background:rgba(13,11,11,.55);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.13);box-shadow:inset 0 1px rgba(255,255,255,.08),0 14px 40px rgba(0,0,0,.18);border-radius:999px;}
  .sw-nav__item{font:inherit;font-size:.78rem;letter-spacing:.02em;color:var(--sw-ink-soft);border:0;background:transparent;cursor:pointer;padding:8px 15px;border-radius:999px;transition:color .25s,background .25s,transform .25s;}
  .sw-nav__item:hover{color:var(--sw-ink);transform:translateY(-1px);} .sw-nav__item.is-active{color:#160d0e;background:linear-gradient(135deg,#f1d8d7,var(--sw-accent));box-shadow:0 5px 16px color-mix(in srgb,var(--sw-accent) 22%,transparent);}
  .sw-topcta{text-decoration:none;font-weight:750;font-size:.98rem;letter-spacing:.015em;color:#241114;display:inline-flex;align-items:center;justify-content:center;gap:18px;flex-shrink:0;box-sizing:border-box;min-width:158px;min-height:54px;padding:14px 26px;border:1px solid #ffe9e2;border-radius:999px;white-space:nowrap;background:linear-gradient(125deg,#fff0e4 0%,#efbdbe 52%,#d993a0 100%);box-shadow:0 0 0 4px rgba(183,110,121,.18),0 10px 36px rgba(183,110,121,.35),inset 0 1px rgba(255,255,255,.8);transition:transform .25s,box-shadow .25s,filter .25s;}
  .sw-topcta__arrow{display:inline-block;font-size:1.2rem;line-height:1;transition:transform .25s ease;}
  .sw-topcta:hover .sw-topcta__arrow{transform:translateX(3px);}
  .sw-topcta:hover{transform:translateY(-2px);filter:saturate(1.08) brightness(1.04);box-shadow:0 0 0 1px rgba(255,228,223,.58),0 0 0 5px rgba(183,110,121,.2),0 14px 36px rgba(183,110,121,.46),inset 0 1px rgba(255,255,255,.72);}
  .sw-topcta:focus-visible,.sw-btn:focus-visible{outline:3px solid #f8dcd8;outline-offset:4px;box-shadow:0 0 0 7px rgba(183,110,121,.3),0 12px 34px rgba(183,110,121,.42);}
  .sw-stage{position:fixed;inset:0;z-index:10;pointer-events:none;contain:layout paint;}
  .sw-scene{position:absolute;inset:0;opacity:0;overflow:hidden;contain:paint;}
  .sw-scene::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(180deg,rgba(111,55,36,.055),transparent 38%,rgba(0,0,0,.17)),radial-gradient(85% 95% at 58% 45%,transparent 50%,rgba(0,0,0,.22) 100%);}
  .sw-scene__video,.sw-scene__still{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 42%;filter:saturate(1.08) contrast(1.04) brightness(1.02);transform:translateZ(0);}
  .sw-scene__still{will-change:auto;} .sw-scene.has-clip .sw-scene__still{opacity:0;} .sw-scene__video{z-index:1;}
  .sw-copylayer{position:fixed;inset:0;z-index:20;pointer-events:none;}
  .sw-copylayer::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 44% 50% at 15% 33%,rgba(5,5,5,.76),transparent 100%),linear-gradient(90deg,rgba(5,5,5,.5),rgba(5,5,5,.16) 38%,transparent 62%);}
  /* A fixed upper-third start keeps the headline noticeable at every length.
     Only the small scroll offset moves: no centering math can lower the copy.
     Keep long copy scrollable, but chain wheel/touch scrolling to the page when
     it fits or reaches an edge. Containment would trap input over the text. */
  .sw-copy{--sw-copy-top:clamp(128px,21svh,230px);position:absolute;left:clamp(28px,7vw,112px);top:var(--sw-copy-top);bottom:auto;transform:translateY(var(--sw-copy-offset,0px));width:min(44vw,580px);max-height:calc(100svh - var(--sw-copy-top) - 56px);overflow-y:auto;overscroll-behavior:auto;scrollbar-width:thin;padding:4px 8px 8px 0;opacity:0;will-change:opacity,transform;transition:opacity .28s ease-out,transform .38s cubic-bezier(.2,.7,.2,1);}
  .sw-copy__num{font-family:ui-monospace,Menlo,monospace;font-size:.68rem;letter-spacing:.16em;color:var(--sw-ink-soft);opacity:.82;}
  .sw-copy__eyebrow{display:flex;align-items:center;gap:12px;margin-top:18px;font-family:var(--sw-font-body);font-weight:700;font-size:.74rem;letter-spacing:.19em;text-transform:uppercase;color:#ebbec5;}
  .sw-copy__eyebrow::before{content:"";width:32px;height:1px;background:var(--sw-accent);box-shadow:0 0 12px color-mix(in srgb,var(--sw-accent) 65%,transparent);}
  .sw-copy__title{font-family:var(--sw-font-display);font-weight:400;color:#fff7f2;font-size:clamp(2.6rem,5.1vw,4.8rem);line-height:1.02;margin:18px 0 0;letter-spacing:-.035em;max-width:14ch;text-wrap:balance;text-shadow:0 2px 8px rgba(0,0,0,.32),0 4px 30px rgba(0,0,0,.52);}
  .sw-copy__body{margin-top:24px;font-size:clamp(1rem,1.25vw,1.14rem);line-height:1.65;color:#ece0dc;max-width:38ch;text-wrap:pretty;text-shadow:0 2px 16px rgba(0,0,0,.8);}
  .sw-copy__tags{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin:25px 0 0;padding:0;}
  .sw-copy__tags li{font-size:.7rem;font-weight:600;letter-spacing:.04em;color:color-mix(in srgb,var(--sw-accent) 82%,#fff);padding:8px 13px;border-radius:999px;background:rgba(11,8,8,.52);backdrop-filter:blur(8px);border:1px solid color-mix(in srgb,var(--sw-accent) 42%,transparent);}
  .sw-copy__cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:31px;pointer-events:auto;}
  .sw-btn{text-decoration:none;font-weight:700;font-size:.86rem;letter-spacing:.01em;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-height:44px;padding:14px 24px;border-radius:999px;transition:transform .25s,box-shadow .25s,background .25s,filter .25s;}
  .sw-btn--primary{color:#160d0e;background:linear-gradient(135deg,#f1d8d7,var(--sw-accent));box-shadow:0 10px 26px color-mix(in srgb,var(--sw-accent) 28%,transparent);} .sw-btn--primary:hover{transform:translateY(-2px);box-shadow:0 14px 32px color-mix(in srgb,var(--sw-accent) 38%,transparent);}
  .sw-btn--ghost{color:var(--sw-ink);border:1px solid rgba(255,255,255,.3);background:rgba(5,5,5,.22);backdrop-filter:blur(8px);} .sw-btn--ghost:hover{transform:translateY(-2px);border-color:var(--sw-accent);background:rgba(183,110,121,.12);}
  .sw-route{position:fixed;right:clamp(14px,2.4vw,30px);top:50%;z-index:40;transform:translateY(-50%);display:flex;flex-direction:column;gap:22px;padding:18px 10px;}
  .sw-route::before{content:"";position:absolute;left:50%;top:22px;bottom:22px;width:1px;transform:translateX(-50%);background:linear-gradient(180deg,transparent,var(--sw-accent) 18%,var(--sw-accent) 82%,transparent);opacity:.5;}
  .sw-route__dot{position:relative;border:0;background:transparent;cursor:pointer;width:14px;height:14px;display:grid;place-items:center;}
  .sw-route__dot i{width:8px;height:8px;border-radius:50%;background:color-mix(in srgb,var(--sw-accent) 38%,transparent);border:1px solid color-mix(in srgb,var(--sw-accent) 58%,transparent);transition:transform .3s,background .3s,box-shadow .3s;}
  .sw-route__dot:hover i{transform:scale(1.35);background:#e4b9bb;}
  .sw-route__dot.is-active i{background:#f1d8d7;transform:scale(1.45);box-shadow:0 0 0 5px color-mix(in srgb,var(--sw-accent) 24%,transparent),0 0 18px color-mix(in srgb,var(--sw-accent) 55%,transparent);}
  .sw-route__label{position:absolute;right:24px;top:50%;transform:translateY(-50%) translateX(6px);white-space:nowrap;font-size:.72rem;font-weight:700;letter-spacing:.02em;color:#fff;background:rgba(8,6,7,.92);backdrop-filter:blur(10px);padding:6px 11px;border-radius:999px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;border:1px solid color-mix(in srgb,var(--sw-accent) 42%,transparent);text-shadow:0 1px 5px rgba(0,0,0,.45);}
  .sw-route__dot:hover .sw-route__label,.sw-route__dot.is-active .sw-route__label{opacity:1;transform:translateY(-50%) translateX(0);}
  .sw-hint{position:fixed;left:50%;bottom:26px;z-index:30;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;font-size:.67rem;letter-spacing:.2em;text-transform:uppercase;color:var(--sw-ink-soft);transition:opacity .3s;}
  .sw-hint i{width:22px;height:34px;border-radius:12px;border:1px solid color-mix(in srgb,var(--sw-ink) 36%,transparent);position:relative;box-shadow:inset 0 0 12px rgba(255,255,255,.04);}
  .sw-hint i::after{content:"";position:absolute;left:50%;top:7px;width:4px;height:7px;border-radius:2px;background:var(--sw-accent);transform:translateX(-50%);animation:sw-wheel 1.7s ease-in-out infinite;}
  @keyframes sw-wheel{0%{opacity:0;top:6px}40%{opacity:1}100%{opacity:0;top:17px}}
  /* Advance the camera while sharp, then defocus. Animate fixed-layer parents
     so the video grade, scene framing, header and scroll track stay independent.
     Removing is-navigating drops all exit effects immediately, including fill. */
  .sw-root.is-navigating .sw-stage,.sw-root.is-navigating .sw-sky,.sw-root.is-navigating .sw-copylayer{animation:sw-order-camera-exit ${NAVIGATION_EXIT_MS}ms linear both;}
  .sw-root.is-navigating .sw-sky{animation-name:sw-order-sky-exit;}
  .sw-root.is-navigating .sw-copylayer{animation-name:sw-order-copy-exit;}
  @keyframes sw-order-camera-exit{
     0%{transform:scale(1);filter:blur(0);opacity:1;}
     32%{transform:scale(1.06);filter:blur(0);opacity:1;}
     100%{transform:scale(1.12);filter:blur(8px);opacity:.68;}
   }
   @keyframes sw-order-sky-exit{
     0%{transform:scale(1);filter:blur(0);opacity:1;}
     32%{transform:scale(1.03);filter:blur(0);opacity:1;}
     100%{transform:scale(1.07);filter:blur(8px);opacity:.76;}
   }
   @keyframes sw-order-copy-exit{
     0%{transform:scale(1);filter:blur(0);opacity:1;}
     32%{transform:scale(1.02);filter:blur(0);opacity:.86;}
     100%{transform:scale(1.05);filter:blur(6px);opacity:0;}
   }
  .sw-root.is-navigating .sw-zoom-link{pointer-events:none;cursor:wait;}
  .sw-track{position:relative;z-index:1;width:100%;pointer-events:none;}
  @media (max-width:1100px){.sw-nav{display:none;}}
  @media (max-width:860px){
    .sw-nav{display:none;}
    .sw-copylayer::before{background:linear-gradient(180deg,rgba(5,5,5,.34),rgba(5,5,5,.6) 24%,rgba(5,5,5,.38) 60%,transparent 90%);}
    .sw-copy{--sw-copy-top:clamp(114px,18svh,170px);left:clamp(22px,5.5vw,48px);right:clamp(48px,8vw,64px);width:auto;max-width:560px;max-height:calc(100svh - var(--sw-copy-top) - 62px - env(safe-area-inset-bottom));}
    .sw-topcta{min-width:130px;min-height:48px;padding:12px 18px;gap:12px;font-size:.9rem;}
    .sw-copy__title{font-size:clamp(2rem,8vw,3rem);line-height:1.06;}
    .sw-copy__body{max-width:none;font-size:clamp(.98rem,3.6vw,1.1rem);} .sw-scene__video,.sw-scene__still{object-position:center 46%;}
    .sw-hint{bottom:calc(20px + env(safe-area-inset-bottom));}
    .sw-route{gap:16px;right:6px;} .sw-route__label{display:none;}
  }
  /* Portrait phones crop a 16:9 clip hard; keep the framing centred so the focal
     subject (which the camera dives toward) stays in view. */
  @media (max-width:860px) and (orientation:portrait){
    .sw-scene__video,.sw-scene__still{object-position:center 44%;}
  }
  /* Touch: give the route dots a finger-sized hit area without growing the visible dot. */
  @media (hover:none) and (pointer:coarse){
    .sw-route{padding:14px 6px;}
    .sw-route__dot{width:28px;height:28px;}
    .sw-btn{padding:15px 26px;}
  }
  @media (max-height:560px){
    .sw-copy{--sw-copy-top:106px;max-height:calc(100svh - 140px);}
    .sw-copy__title{font-size:clamp(1.7rem,5vh,2.5rem);margin-top:10px;}
    .sw-copy__eyebrow{margin-top:10px;}
    .sw-copy__body{margin-top:12px;font-size:.94rem;line-height:1.5;}
    .sw-copy__tags{margin-top:14px;}
    .sw-copy__cta{margin-top:18px;}
  }
  @media (max-width:480px){
    .sw-topbar{gap:12px;padding-inline:18px;}
    .sw-brand{gap:8px;}
    .sw-brand__mark,.sw-brand__logo{width:20px;height:24px;}
    .sw-brand__name{font-size:1rem;letter-spacing:.07em;}
    .sw-brand__description{display:none;}
    .sw-topcta{min-width:126px;padding-inline:16px;gap:10px;}
  }
  @media (prefers-reduced-motion:reduce){
    .sw-copy,.sw-stage,.sw-sky,.sw-copylayer,.sw-scene,.sw-zoom-link{transition:none!important;}
    .sw-hint i::after{animation:none;} .sw-pt{display:none;}
    .sw-root.is-navigating .sw-zoom-link{transform:none;filter:none;}
  }
  @media (prefers-reduced-motion:reduce),print{
    .sw-root.is-navigating .sw-stage,.sw-root.is-navigating .sw-sky,.sw-root.is-navigating .sw-copylayer{animation:none!important;transform:none;filter:none;opacity:1;}
  }
  `;
  // Wrap in a cascade layer so the page's own theme tokens (unlayered
  // :root / .sw-root { --sw-bg / --sw-ink / --sw-accent … }) always win over
  // these defaults, regardless of injection order. Enables clean dark themes.
  // Replace stale engine CSS on remount/HMR instead of leaving an old layout
  // behind under the same style id. The style element itself remains a singleton.
  const style = document.getElementById('sw-css') || document.createElement('style');
  style.id = 'sw-css';
  const text = '@layer sw {\n' + css + '\n}';
  if (style.textContent !== text) style.textContent = text;
  if (!style.parentNode) document.head.appendChild(style);
}

// Expose for module + global use.
if (typeof module !== 'undefined' && module.exports) module.exports = { mountLetsScroll };
if (typeof window !== 'undefined') window.mountLetsScroll = mountLetsScroll;
