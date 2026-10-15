import { Metadata } from 'next';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getProducts } from '@/lib/firestore';
import { websiteProductToProduct } from '@/data/catalog';
import OrderForm from '@/components/OrderForm';
import { ProductDetail } from '@/components/catalog/ProductDetail';
import PublicPageFrame from '@/components/PublicPageFrame';
import type { WebsiteProduct } from '@/types/website';

// Product details depend on live Firestore data; this route is allowed to wait
// while the collection resolves instead of blocking the static collection shell.
export const instant = false;

type Props = {
  params: { id: string };
};

async function loadProducts(): Promise<WebsiteProduct[] | null> {
  await connection();
  try {
    return await getProducts();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const products = await loadProducts();
  if (!products) {
    return {
      title: 'FLOMIRA product',
      description: 'The FLOMIRA product catalogue is temporarily unavailable.',
    };
  }
  const product = products.find((p) => p.id === params.id || p.slug === params.id);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: `${product.name} - Flomira`,
    description: product.description || `Order ${product.name} from Flomira`,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const products = await loadProducts();
  if (!products) {
    return (
      <>
        <PublicPageFrame>
          <div className="shop-page">
            <div className="surface px-6 py-16 text-center" role="alert">
              <p className="eyebrow">A small pause in the kitchen</p>
              <h1 className="mt-3 text-3xl font-semibold">This product is temporarily unavailable</h1>
              <p className="muted mx-auto mt-3 max-w-md text-sm leading-7">
                We could not reach the live product catalogue. Please refresh in a moment or contact FLOMIRA for help.
              </p>
              <Link href="/products" className="button-secondary mt-7">Back to the collection</Link>
            </div>
          </div>
        </PublicPageFrame>
      </>
    );
  }
  const product = products.find((p) => p.id === params.id || p.slug === params.id);

  if (!product) {
    notFound();
  }

  const localProduct = websiteProductToProduct(product);

  return (
    <>
      <PublicPageFrame>
        <div className="shop-page">
          <Link
            href="/products"
            className="button-secondary mb-8"
          >
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Products
          </Link>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
            <section aria-label={`${product.name} images`} className="min-w-0">
              <div className="relative h-96 overflow-hidden rounded-3xl border border-[var(--flomira-line-strong)] bg-[var(--flomira-surface-raised)] shadow-[0_1.25rem_3rem_rgba(0,0,0,0.3)] md:h-[34rem]">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.imageAlt}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(183,110,121,0.24),transparent_55%),var(--flomira-surface-raised)] px-6 text-center text-sm text-[var(--flomira-muted)]">
                    Image coming soon
                  </div>
                )}
              </div>

              <div className="surface mt-6 p-6 md:p-8">
                <p className="eyebrow mb-3">FLOMIRA collection</p>
                <h1 id="product-title" className="text-3xl font-semibold tracking-tight md:text-4xl">
                  {product.name}
                </h1>

                {product.description && (
                  <p className="muted mt-4 leading-7">
                    {product.description}
                  </p>
                )}

                <div className="mt-7">
                  <h2 className="mb-3 text-xl font-semibold">Available sizes</h2>
                  <div className="space-y-2">
                    {product.sizes.map((size) => (
                      <div
                        key={size.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--flomira-line)] bg-[rgba(36,32,24,0.72)] px-4 py-3"
                      >
                        <span className="font-medium text-[var(--flomira-warm)]">
                          {size.label}
                          {size.servings > 0 && <span className="muted ml-2 text-sm">({size.servings} servings)</span>}
                        </span>
                        <span className="text-lg font-semibold text-[var(--flomira-copper)]">
                          {size.basePrice.toFixed(2)} TK
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {product.flavors.length > 0 && (
                  <div className="mt-7" aria-labelledby="product-flavors-title">
                    <h2 id="product-flavors-title" className="mb-3 text-xl font-semibold">Available flavors</h2>
                    <ul className="space-y-2">
                      {product.flavors.map((flavor) => (
                        <li key={flavor.name} className="rounded-2xl border border-[var(--flomira-line)] bg-[rgba(36,32,24,0.72)] px-4 py-3">
                          <p className="font-medium text-[var(--flomira-warm)]">{flavor.name}</p>
                          {flavor.description && <p className="muted mt-1 text-sm leading-6">{flavor.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {product.allergens && product.allergens.length > 0 && (
                  <div className="mt-7 rounded-2xl border-l-4 border-[var(--flomira-copper)] bg-[rgba(201,154,128,0.1)] p-4">
                    <div className="flex">
                      <div className="shrink-0">
                        <svg
                          className="size-5 text-[var(--flomira-copper)]"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm leading-6 text-[var(--flomira-muted)]">
                          <span className="font-semibold text-[var(--flomira-blush)]">Allergen warning:</span>{' '}
                          This product contains {product.allergens.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="h-fit lg:sticky lg:top-28" aria-label={`Order ${product.name}`}>
              <OrderForm product={product} />
              {localProduct && (
                <div className="surface mt-8 p-6 md:p-8">
                  <p className="eyebrow mb-3">Storefront preview</p>
                  <h2 className="text-2xl font-semibold tracking-tight">Save a local cake plan</h2>
                  <p className="muted mt-3 text-sm leading-6">Choose a sample size, flavor, and note to keep a preview selection in this browser. It is separate from the live order form above.</p>
                  <div className="mt-6">
                    <ProductDetail product={localProduct} compact />
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </PublicPageFrame>
    </>
  );
}
