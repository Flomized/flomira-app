import type { Metadata } from 'next';
import { CartView } from '../../components/catalog/CartView';
import PublicPageFrame from '../../components/PublicPageFrame';
import { PreviewNote } from '../../components/catalog/PreviewNote';

export const metadata: Metadata = {
  title: 'Your preview cart',
  description: 'Review your FLOMIRA concept selections and sample pricing before exploring the checkout preview.',
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <PublicPageFrame>
      <div className="shop-page">
        <header className="mb-12 max-w-3xl">
          <p className="eyebrow mb-5">A few lovely things</p>
          <h1 className="text-4xl font-medium tracking-tight sm:text-6xl">Your preview cart.</h1>
          <p className="muted mt-5 max-w-2xl text-lg leading-relaxed">Your chosen concepts, with every little detail in place. Review, adjust, and imagine the occasion.</p>
          <PreviewNote images />
        </header>
        <CartView />
      </div>
    </PublicPageFrame>
  );
}
