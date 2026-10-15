'use client';

import Link from 'next/link';
import { useCart } from '../CartProvider';
import { ProductCard } from './ProductCard';
import { StorageNotice } from './StorageNotice';

export function FavoritesView() {
  const { favorites, ready, catalog, catalogError } = useCart();
  const saved = catalog.filter((product) => favorites.includes(product.id));

  return (
    <section aria-label="Saved concepts">
      <StorageNotice />
      {catalogError ? (
        <div className="surface p-8 text-center sm:p-12" role="alert">
          <p className="eyebrow mb-3">The collection is taking a moment</p>
          <p className="muted">{catalogError}</p>
        </div>
      ) : !ready ? (
        <div role="status" aria-busy="true" className="surface p-8 text-center sm:p-12">
          <p className="eyebrow mb-3">One moment</p>
          <p className="muted">Loading your saved concepts…</p>
        </div>
      ) : saved.length === 0 ? (
        <div className="surface rounded-3xl px-6 py-16 text-center">
          <p className="eyebrow mb-4">A little inspiration</p>
          <h2 className="mb-4 text-3xl font-medium tracking-tight md:text-4xl">Your favorites are waiting to happen.</h2>
          <p className="muted mx-auto mb-8 max-w-md leading-relaxed">Tap the heart on a concept you love. We’ll keep your ideas together in this browser.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/products" className="button-primary">Discover the collection</Link>
            <Link href="/faq" className="button-secondary">How favorites work</Link>
          </div>
        </div>
      ) : (
        <>
          <p role="status" aria-live="polite" className="surface mb-8 p-4 text-sm text-[#e0bdc3]">{saved.length} saved {saved.length === 1 ? 'concept' : 'concepts'} · stored in this browser</p>
          <div className="grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
            {saved.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link href="/products" className="button-secondary">Keep exploring</Link>
            <Link href="/cart" className="button-primary">Review your cart</Link>
          </div>
        </>
      )}
    </section>
  );
}
