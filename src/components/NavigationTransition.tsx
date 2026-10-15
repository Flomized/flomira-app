'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export const NAVIGATION_TRANSITION_MS = 560;
const NAVIGATION_RECOVERY_MS = 3200;

function clearBusy(anchor: HTMLAnchorElement | null) {
  anchor?.removeAttribute('aria-busy');
}

function clearTransitionClasses() {
  document.documentElement.classList.remove('flomira-nav-exiting', 'flomira-nav-entering');
}

function sameDestination(target: URL, current: URL) {
  return target.pathname === current.pathname
    && target.search === current.search
    && target.hash === current.hash;
}

function isModifiedClick(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export default function NavigationTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const mounted = useRef(false);
  const pending = useRef(false);
  const pendingAnchor = useRef<HTMLAnchorElement | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const recoveryTimer = useRef<number | null>(null);
  const enterTimer = useRef<number | null>(null);

  useEffect(() => {
    mounted.current = true;

    function handleClick(event: MouseEvent) {
      if (!mounted.current || event.defaultPrevented || isModifiedClick(event)) return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest('a');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      // The homepage engine owns only its explicit zoom links. Other links in
      // the engine (for example the Contact CTA) still need this shared route
      // transition instead of falling back to a document navigation.
      if (anchor.classList.contains('sw-zoom-link') || anchor.hasAttribute('data-no-page-transition')) return;
      if (anchor.target || anchor.hasAttribute('download')) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;

      let target: URL;
      try {
        target = new URL(rawHref, window.location.href);
      } catch {
        return;
      }

      const current = new URL(window.location.href);
      if (target.origin !== current.origin || !/^https?:$/.test(target.protocol) || sameDestination(target, current)) return;

      event.preventDefault();
      if (pending.current) return;
      pending.current = true;
      pendingAnchor.current = anchor;
      anchor.setAttribute('aria-busy', 'true');

      const destinationPath = `${target.pathname}${target.search}`;
      const destination = `${destinationPath}${target.hash}`;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      try { router.prefetch(destinationPath); } catch { /* Navigation still works without prefetch. */ }

      clearTransitionClasses();
      if (!reduced) document.documentElement.classList.add('flomira-nav-exiting');
      transitionTimer.current = window.setTimeout(() => {
        transitionTimer.current = null;
        if (pending.current) document.documentElement.classList.remove('flomira-nav-exiting');
      }, reduced ? 0 : NAVIGATION_TRANSITION_MS);
      recoveryTimer.current = window.setTimeout(() => {
        pending.current = false;
        clearBusy(pendingAnchor.current);
        pendingAnchor.current = null;
        clearTransitionClasses();
        recoveryTimer.current = null;
      }, NAVIGATION_RECOVERY_MS);

      // Start the route request while the short exit is playing. Waiting for
      // the full animation before pushing made slow RSC/Firestore routes hold
      // the outgoing page in its final blurred frame.
      try {
        router.push(destination, { scroll: true });
      } catch {
        pending.current = false;
        clearBusy(pendingAnchor.current);
        pendingAnchor.current = null;
        if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
        if (recoveryTimer.current !== null) window.clearTimeout(recoveryTimer.current);
        transitionTimer.current = null;
        recoveryTimer.current = null;
        clearTransitionClasses();
      }
    }

    document.addEventListener('click', handleClick, true);
    return () => {
      mounted.current = false;
      document.removeEventListener('click', handleClick, true);
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
      if (recoveryTimer.current !== null) window.clearTimeout(recoveryTimer.current);
      if (enterTimer.current !== null) window.clearTimeout(enterTimer.current);
      clearBusy(pendingAnchor.current);
      clearTransitionClasses();
    };
  }, [router]);

  useEffect(() => {
    if (!mounted.current) {
      previousPath.current = pathname;
      mounted.current = true;
      return;
    }
    if (previousPath.current === pathname) return;

    previousPath.current = pathname;
    pending.current = false;
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    if (recoveryTimer.current !== null) window.clearTimeout(recoveryTimer.current);
    transitionTimer.current = null;
    recoveryTimer.current = null;
    clearBusy(pendingAnchor.current);
    pendingAnchor.current = null;
    document.documentElement.classList.remove('flomira-nav-exiting');
    document.documentElement.classList.add('flomira-nav-entering');
    if (enterTimer.current !== null) window.clearTimeout(enterTimer.current);
    enterTimer.current = window.setTimeout(() => {
      document.documentElement.classList.remove('flomira-nav-entering');
      enterTimer.current = null;
    }, NAVIGATION_TRANSITION_MS);
  }, [pathname]);

  return null;
}
