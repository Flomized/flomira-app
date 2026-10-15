import { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductResults, ProductResultsFallback } from '@/components/ProductResults';
import PublicPageFrame from '@/components/PublicPageFrame';

export const metadata: Metadata = {
  title: 'Products - Flomira',
  description: 'Browse our delicious products',
};

// Firestore's server SDK performs request-time work while resolving the live
// catalogue. Keep the navigation shell usable, but allow that data boundary
// to finish without Next's instant-navigation validation treating it as an
// error in development.
export const instant = false;

export default function ProductsPage() {
  return (
    <>
      <PublicPageFrame>
        <div className="shop-page collection-entry">
          <header className="mb-12 max-w-3xl">
            <p className="eyebrow mb-4">The FLOMIRA collection</p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
              Our Products
            </h1>
            <p className="muted mt-5 max-w-2xl text-base leading-8 md:text-lg">
              Discover a carefully crafted selection of delicious treats, made for slow celebrations and beautifully considered moments.
            </p>
          </header>

          <Suspense fallback={<ProductResultsFallback />}>
            <ProductResults />
          </Suspense>
        </div>
      </PublicPageFrame>
    </>
  );
}
