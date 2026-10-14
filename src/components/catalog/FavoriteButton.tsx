'use client';

import { useCart } from '../CartProvider';

export function FavoriteButton({ productId, name, showLabel = false }: {
  productId: string;
  name: string;
  showLabel?: boolean;
}) {
  const { favorites, ready, toggleFavorite } = useCart();
  const saved = favorites.includes(productId);

  return (
    <button
      type="button"
      disabled={!ready}
      aria-pressed={saved}
      aria-label={`${saved ? 'Remove' : 'Save'} ${name} ${saved ? 'from' : 'to'} favorites`}
      onClick={() => toggleFavorite(productId)}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-[#0a0a0a]/85 text-white backdrop-blur-sm transition-colors hover:border-[#cba0a5] hover:text-[#e0bdc3] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#cba0a5] disabled:cursor-wait disabled:opacity-50 ${showLabel ? 'px-5 py-3 text-sm' : 'p-3'}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
      {showLabel && <span>{!ready ? 'Loading favorites…' : saved ? 'Saved to favorites' : 'Save for later'}</span>}
    </button>
  );
}
