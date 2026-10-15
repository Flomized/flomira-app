'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useCart } from './CartProvider';
import { useBusinessSettings } from './BusinessSettingsProvider';
import type { BusinessSettings } from '@/types/website';

const navItems = [
  { href: '/products', label: 'Collection' },
  { href: '/favorites', label: 'Favorites' },
  { href: '/orders', label: 'Saved drafts' },
  { href: '/contact', label: 'Contact' },
  { href: '/faq', label: 'FAQ' },
];

function Brand({ settings }: { settings: BusinessSettings | null }) {
  const businessName = settings?.businessName?.trim() || 'FLOMIRA';
  const logoUrl = settings?.logoUrl?.trim();

  return (
    <Link href="/" className="site-brand" aria-label={`${businessName} home`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="site-brand__logo" />
      ) : (
        <span className="site-brand__mark" aria-hidden="true" />
      )}
      <span>{businessName}</span>
    </Link>
  );
}

function CartLink({ mobile = false }: { mobile?: boolean }) {
  const { count, ready } = useCart();
  return (
    <Link
      href="/cart"
      className={mobile ? 'site-mobile-link' : 'site-cart-link'}
      aria-label={ready && count ? `Preview cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Preview cart'}
    >
      <span>Cart</span>
      {ready && count > 0 && <span className="site-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
    </Link>
  );
}

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { favorites } = useCart();
  const { settings } = useBusinessSettings();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;

  return (
    <div className="site-frame">
      <header className="site-header">
        <div className="site-header__inner">
          <Brand settings={settings} />
          <nav className="site-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`site-nav__link${pathname === item.href || (item.href === '/products' && pathname.startsWith('/products/')) ? ' is-active' : ''}`}
              >
                {item.label}
                {item.href === '/favorites' && favorites.length > 0 && <span className="site-nav__count">{favorites.length}</span>}
              </Link>
            ))}
          </nav>
          <div className="site-header__actions">
            <CartLink />
            <Link href="/products" className="site-header__cta">Order now <span aria-hidden="true">↗</span></Link>
            <button
              type="button"
              className="site-menu-button"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              onClick={() => setMenuPath(menuOpen ? null : pathname)}
            >
              <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="mobile-navigation" className="site-mobile-nav" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="site-mobile-link">
                <span>{item.label}</span>
                {item.href === '/favorites' && favorites.length > 0 && <span className="site-count">{favorites.length}</span>}
              </Link>
            ))}
            <CartLink mobile />
            <Link href="/products" className="button-primary mt-2 w-full text-center">Order now</Link>
          </nav>
        )}
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="site-footer__top">
          <div>
            <Brand settings={settings} />
            <p className="site-footer__copy">{settings?.description?.trim() || 'Cakes made with love, imagined with intention.'}</p>
          </div>
          <div className="site-footer__links" aria-label="Footer navigation">
            <Link href="/products">Collection</Link>
            <Link href="/cart">Cart</Link>
            <Link href="/orders">Saved drafts</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/faq">FAQ</Link>
          </div>
        </div>
        <div className="site-footer__bottom">
          <p>Preview cart and drafts stay on this browser · Live order requests are sent for confirmation.</p>
          <Link href="/">Back to the experience <span aria-hidden="true">↗</span></Link>
        </div>
      </footer>
    </div>
  );
}
