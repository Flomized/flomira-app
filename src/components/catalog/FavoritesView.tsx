'use client';

import Link from 'next/link';
import { products } from '../../data/catalog.ts';
import { useCart } from '../CartProvider';
import { ProductCard } from './ProductCard';
import { StorageNotice } from './StorageNotice';

export function FavoritesView() {
  const { favorites, ready } = useCart();
  const saved = products.filter((product) => favorites.includes(product.id));

  return (
    <section aria-label="Saved concepts">
      <StorageNotice />
      {!ready ? (
        <p role="status" aria-busy="true" className="surface rounded-3xl p-8 text-[#aaaaaa]">Loading your saved concepts…</p>
      ) : saved.length === 0 ? (
        <div className="surface rounded-3xl px-6 py-16 text-center">
          <p className="eyebrow mb-4">A little inspiration</p>
          <h2 className="mb-4 text-3xl font-medium tracking-tight md:text-4xl">Your favorites are waiting to happen.</h2>
          <p className="mx-auto mb-8 max-w-md leading-relaxed text-[#aaaaaa]">Tap the heart on a concept you love. We’ll keep your ideas together in this browser.</p>
          <Link href="/products" className="button-primary">Discover the collection</Link>
        </div>
      ) : (
        <>
          <p role="status" aria-live="polite" className="mb-8 text-sm text-[#aaaaaa]">{saved.length} saved {saved.length === 1 ? 'concept' : 'concepts'} · stored in this browser</p>
          <div className="grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
            {saved.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          <div className="mt-12"><Link href="/products" className="button-secondary">Keep exploring</Link></div>
        </>
      )}
    </section>
  );
}
