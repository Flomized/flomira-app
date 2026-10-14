'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { siteConfig, sections, connectors } from '@/data/content';

export default function ScrollEngine() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || mountedRef.current) return;
    mountedRef.current = true;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    // Dynamically import the engine so it doesn't break SSR
    import('./scrub-engine.js').then((module) => {
      if (disposed || !containerRef.current) return;
      const { mountLetsScroll } = module;
      cleanup = mountLetsScroll(containerRef.current, {
        brand: siteConfig.brand,
        cta: siteConfig.cta,
        hint: siteConfig.hint,
        diveScroll: siteConfig.diveScroll,
        connectorPlaybackRate: siteConfig.connectorPlaybackRate,
        connectorHandoffProgress: siteConfig.connectorHandoffProgress,
        connScroll: siteConfig.connScroll,
        crossfade: siteConfig.crossfade,
        theme: siteConfig.theme,
        sections: sections,
        connectors: connectors,
        // The engine only forwards validated same-origin product paths. Use a
        // client route transition to avoid a document reload after the zoom.
        onPrefetch: (href: string) => router.prefetch(href),
        onNavigate: (href: string) => router.push(href, { scroll: true }),
      });

      // Inject theme overrides dynamically to root
      document.documentElement.style.setProperty('--sw-bg', siteConfig.theme.bg);
      document.documentElement.style.setProperty('--sw-ink', siteConfig.theme.ink);
      document.documentElement.style.setProperty('--sw-ink-soft', siteConfig.theme.inkSoft);
      document.documentElement.style.setProperty('--sw-accent', siteConfig.theme.accent);
      containerRef.current.style.setProperty('--sw-bg', siteConfig.theme.bg);
      containerRef.current.style.setProperty('--sw-ink', siteConfig.theme.ink);
      containerRef.current.style.setProperty('--sw-ink-soft', siteConfig.theme.inkSoft);
      containerRef.current.style.setProperty('--sw-accent', siteConfig.theme.accent);
    });

    return () => {
      disposed = true;
      cleanup?.();
      mountedRef.current = false;
    };

  }, [router]);

  return <div ref={containerRef} id="world" className="sw-root w-full min-h-screen" />;
}
