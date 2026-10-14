import type { Metadata } from 'next';
import { FavoritesView } from '../../components/catalog/FavoritesView';
import { PreviewNote } from '../../components/catalog/PreviewNote';

export const metadata: Metadata = {
  title: 'Your favorites',
  description: 'Keep your favorite FLOMIRA collection concepts together in this browser.',
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return (
    <div className="shop-page">
      <div className="mb-12">
        <p className="eyebrow mb-5">A collection of your own</p>
        <h1 className="mb-5 text-5xl font-medium tracking-tight md:text-7xl">Your favorites.</h1>
        <p className="mb-6 max-w-xl text-lg leading-relaxed text-[#aaaaaa]">The ones you keep coming back to. Save a little inspiration for another day.</p>
        <PreviewNote images />
      </div>
      <FavoritesView />
    </div>
  );
}
