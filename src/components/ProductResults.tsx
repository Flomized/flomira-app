import Image from 'next/image';
import Link from 'next/link';
import { connection } from 'next/server';
import { getProducts } from '@/lib/firestore';
import { FavoriteButton } from '@/components/catalog/FavoriteButton';

export function ProductResultsFallback() {
  return (
    <div
      role="status"
      aria-label="Loading products"
      aria-busy="true"
      className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
    >
      {[1, 2, 3].map((item) => (
        <div key={item} className="surface overflow-hidden rounded-3xl" aria-hidden="true">
          <div className="h-64 animate-pulse bg-[rgba(183,110,121,0.16)]" />
          <div className="space-y-4 p-6">
            <div className="h-6 w-2/3 animate-pulse rounded-full bg-[rgba(232,160,176,0.18)]" />
            <div className="h-4 w-full animate-pulse rounded-full bg-[rgba(196,181,168,0.12)]" />
            <div className="h-4 w-5/6 animate-pulse rounded-full bg-[rgba(196,181,168,0.12)]" />
            <div className="h-11 w-full animate-pulse rounded-full bg-[rgba(201,154,128,0.18)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export async function ProductResults() {
  // The Firebase web SDK performs request-time timestamp work internally. Keep
  // it inside the streamed boundary so the static navigation shell stays fast.
  await connection();
  let products;
  try {
    products = await getProducts();
  } catch {
    return (
      <div className="surface px-6 py-16 text-center" role="alert">
        <p className="eyebrow">A small pause in the kitchen</p>
        <h2 className="mt-3 text-3xl font-semibold">The live collection is unavailable</h2>
        <p className="muted mx-auto mt-3 max-w-md text-sm leading-7">
          We could not reach the current product catalogue. Please refresh in a moment or leave us a note for a custom celebration.
        </p>
        <Link href="/contact" className="button-secondary mt-7">
          Contact FLOMIRA <span aria-hidden="true">↗</span>
        </Link>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="surface px-6 py-16 text-center">
        <p className="eyebrow">A quiet moment in the kitchen</p>
        <h2 className="mt-3 text-3xl font-semibold">No products are ready yet</h2>
        <p className="muted mx-auto mt-3 max-w-md text-sm leading-7">
          Our collection is being refreshed. Leave us a note for a custom celebration, or check back soon for the next reveal.
        </p>
        <Link href="/contact" className="button-secondary mt-7">
          Ask about a custom cake <span aria-hidden="true">↗</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        return (
          <article
            key={product.id}
            className="surface group relative flex h-full flex-col overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-1 hover:border-[var(--flomira-copper)] hover:shadow-[0_1.5rem_3.2rem_rgba(0,0,0,0.36)]"
          >
            <Link
              href={`/products/${product.id}`}
              className="block h-full rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flomira-blush)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--flomira-bg)]"
              aria-label={`View ${product.name} details and ordering options`}
            >
              <div className="relative h-64 overflow-hidden bg-[var(--flomira-surface-raised)]">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.imageAlt}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(183,110,121,0.24),transparent_55%),var(--flomira-surface-raised)] px-6 text-center text-sm text-[var(--flomira-muted)]">
                    Image coming soon
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(13,13,13,0.78)] to-transparent" aria-hidden="true" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  {product.featured && (
                    <span className="rounded-full border border-[rgba(246,237,228,0.45)] bg-[var(--flomira-rose-gold)] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--flomira-bg)]">
                      Featured
                    </span>
                  )}
                  <span className="rounded-full border border-[rgba(246,237,228,0.2)] bg-[rgba(13,13,13,0.72)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--flomira-warm)] backdrop-blur-sm">
                    {product.visible ? 'In collection' : 'Coming soon'}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-semibold tracking-tight transition-colors group-hover:text-[var(--flomira-blush)]">
                    {product.name}
                  </h2>
                  <span className="mt-1 shrink-0 text-[var(--flomira-copper)]" aria-hidden="true">↗</span>
                </div>

                {product.description && (
                  <p className="muted mb-5 line-clamp-3 text-sm leading-6">{product.description}</p>
                )}

                <div className="mb-5 space-y-2 border-y border-[var(--flomira-line)] py-4">
                  <p className="eyebrow mb-3">Sizes &amp; pricing</p>
                    {product.sizes.map((size) => (
                      <div key={size.id} className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-[var(--flomira-warm)]">{size.label}</span>
                      <span className="font-semibold text-[var(--flomira-copper)]">{size.basePrice.toFixed(2)} TK</span>
                      </div>
                    ))}
                </div>

                {product.flavors.length > 0 && (
                  <p className="mb-5 text-xs leading-5 text-[var(--flomira-muted)]">
                    <span className="font-semibold text-[var(--flomira-blush)]">Flavors:</span>{' '}
                    {product.flavors.map((flavor) => flavor.name).join(', ')}
                  </p>
                )}

                {product.allergens && product.allergens.length > 0 && (
                  <p className="mb-5 rounded-xl border-l-2 border-[var(--flomira-copper)] bg-[rgba(201,154,128,0.1)] px-3 py-2 text-xs leading-5 text-[var(--flomira-muted)]">
                    <span className="font-semibold text-[var(--flomira-blush)]">Allergen note:</span>{' '}
                    contains {product.allergens.join(', ')}
                  </p>
                )}

                <span className="button-primary mt-auto w-full">
                  View details &amp; order <span aria-hidden="true">↗</span>
                </span>
              </div>
            </Link>
            <div className="absolute right-4 top-4">
              <FavoriteButton productId={product.id} name={product.name} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
