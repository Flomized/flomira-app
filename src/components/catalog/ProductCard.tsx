import Image from 'next/image';
import Link from 'next/link';
import { formatMoney, type Product } from '../../data/catalog.ts';
import { FavoriteButton } from './FavoriteButton';

export function ProductCard({ product }: { product: Product }) {
  const startingPrice = Math.min(...product.sizes.map((size) => size.price));

  return (
    <article className="surface group min-w-0 p-3 sm:p-4">
      <div className="relative mb-5">
        <Link
          href={`/products/${product.slug}`}
          className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-[#171414] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#cba0a5]"
          aria-label={`Explore ${product.name}`}
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.imageAlt}
              fill
              sizes="(min-width: 1280px) 380px, (min-width: 768px) 45vw, 90vw"
              loading="lazy"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#aaaaaa]">Image coming soon</div>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-5 pt-14 text-xs tracking-wide text-white/85">
            Editorial collection image
          </span>
        </Link>
        <div className="absolute right-3 top-3">
          <FavoriteButton productId={product.id} name={product.name} />
        </div>
      </div>
      <p className="eyebrow mb-2">{product.category}</p>
      <h2 className="text-2xl font-medium tracking-tight">
        <Link href={`/products/${product.slug}`} className="transition-colors hover:text-[#cba0a5]">{product.name}</Link>
      </h2>
      <p className="muted mb-4 mt-2 min-h-12 text-sm leading-6">{product.description}</p>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-white/10 pt-4">
        <p className="text-sm"><span className="muted">Sample from </span>{formatMoney(startingPrice)}</p>
        <Link href={`/products/${product.slug}`} className="py-1 text-sm text-[#cba0a5] hover:text-white" aria-label={`Choose options for ${product.name}`}>
          Explore concept <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}
