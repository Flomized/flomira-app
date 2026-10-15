'use client';

import { useMemo, useState } from 'react';
import type { Product } from '../../data/catalog.ts';
import { useCart } from '../CartProvider';
import { ProductCard } from './ProductCard';
import { StorageNotice } from './StorageNotice';

function startingPrice(product: Product) {
  return Math.min(...product.sizes.map((size) => size.price));
}

export function CollectionBrowser() {
  const { catalog, ready, catalogError } = useCart();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All concepts');
  const [sort, setSort] = useState('featured');
  const categories = useMemo(() => ['All concepts', ...new Set(catalog.map((product) => product.category))], [catalog]);
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US');

  const visible = catalog.filter((product) => {
    const matchesCategory = category === 'All concepts' || product.category === category;
    const searchable = [product.name, product.description, product.category, ...product.flavors].join(' ').toLocaleLowerCase('en-US');
    return matchesCategory && searchable.includes(normalizedQuery);
  }).sort((left, right) => {
    if (sort === 'price-low') return startingPrice(left) - startingPrice(right);
    if (sort === 'price-high') return startingPrice(right) - startingPrice(left);
    if (sort === 'name') return left.name.localeCompare(right.name, 'en-US');
    return Number(right.featured) - Number(left.featured);
  });

  function resetFilters() {
    setQuery('');
    setCategory('All concepts');
    setSort('featured');
  }

  return (
    <section aria-label="Explore the collection">
      <StorageNotice />
      {catalogError ? (
        <div className="surface p-8 text-center sm:p-12" role="alert">
          <p className="eyebrow mb-3">The collection is taking a moment</p>
          <p className="muted">{catalogError}</p>
        </div>
      ) : !ready ? (
        <div className="surface p-8 text-center sm:p-12" role="status" aria-busy="true">
          <p className="eyebrow mb-3">One moment</p>
          <p className="muted">Loading the live collection…</p>
        </div>
      ) : (
        <>
      <div className="mb-8 space-y-6 border-y border-white/10 py-6">
        <div className="grid gap-5 md:grid-cols-[1fr_16rem]">
          <div>
            <label htmlFor="collection-search" className="field-label">Find your next sweet moment</label>
            <input
              id="collection-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cakes, flavors, little gifts…"
              className="field w-full"
              aria-controls="collection-results"
            />
          </div>
          <div>
            <label htmlFor="collection-sort" className="field-label">Sort collection</label>
            <select id="collection-sort" value={sort} onChange={(event) => setSort(event.target.value)} className="field w-full">
              <option value="featured">Featured concepts</option>
              <option value="price-low">Sample price: low to high</option>
              <option value="price-high">Sample price: high to low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
        </div>
        <fieldset>
          <legend className="field-label mb-3">Filter by category</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={category === option}
                aria-controls="collection-results"
                onClick={() => setCategory(option)}
                className={`min-h-11 rounded-full border px-5 py-2 text-sm transition-colors ${category === option ? 'border-[#cba0a5] bg-[#cba0a5] text-[#0a0a0a]' : 'border-white/20 text-[#aaaaaa] hover:border-[#cba0a5] hover:text-white'}`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-[#aaaaaa]">
          {visible.length} {visible.length === 1 ? 'concept' : 'concepts'}{normalizedQuery ? ` matching “${query.trim()}”` : ' to explore'}
        </p>
        {(query || category !== 'All concepts' || sort !== 'featured') && (
          <button type="button" onClick={resetFilters} className="min-h-11 text-sm text-[#cba0a5] underline underline-offset-4 hover:text-white">
            Reset search & filters
          </button>
        )}
      </div>
      <div id="collection-results">
        {visible.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="surface rounded-3xl px-6 py-16 text-center">
            <h2 className="mb-3 text-3xl font-medium tracking-tight">No concepts found</h2>
            <p className="mx-auto mb-7 max-w-md text-[#aaaaaa]">Try a different flavor or category, or clear your filters to rediscover the full collection.</p>
            <button type="button" onClick={resetFilters} className="button-secondary">Explore all concepts</button>
          </div>
        )}
      </div>
        </>
      )}
    </section>
  );
}
