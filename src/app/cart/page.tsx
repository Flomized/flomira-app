import type { Metadata } from 'next';
import { CartView } from '../../components/catalog/CartView';
import { PreviewNote } from '../../components/catalog/PreviewNote';

export const metadata: Metadata = {
  title: 'Your preview cart',
  description: 'Review your FLOMIRA concept selections and sample pricing before exploring the checkout preview.',
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="shop-page">
      <div className="mb-10">
        <p className="eyebrow mb-5">A few lovely things</p>
        <h1 className="mb-5 text-5xl font-medium tracking-tight md:text-7xl">Your preview cart.</h1>
        <p className="mb-6 max-w-2xl text-lg leading-relaxed text-[#aaaaaa]">Your chosen concepts, with every little detail in place. Review, adjust, and imagine the occasion.</p>
        <PreviewNote images />
      </div>
      <CartView />
    </div>
  );
}
