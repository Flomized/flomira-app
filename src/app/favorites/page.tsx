import type { Metadata } from 'next';
import { FavoritesView } from '../../components/catalog/FavoritesView';
import PublicPageFrame from '../../components/PublicPageFrame';
import { PreviewNote } from '../../components/catalog/PreviewNote';

export const metadata: Metadata = {
  title: 'Your favorites',
  description: 'Keep your favorite FLOMIRA collection concepts together in this browser.',
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return (
    <PublicPageFrame>
      <div className="shop-page">
        <header className="mb-12 max-w-3xl">
          <p className="eyebrow mb-5">A collection of your own</p>
          <h1 className="text-4xl font-medium tracking-tight sm:text-6xl">Your favorites.</h1>
          <p className="muted mt-5 max-w-xl text-lg leading-relaxed">The ones you keep coming back to. Save a little inspiration for another day.</p>
          <PreviewNote images />
        </header>
        <FavoritesView />
      </div>
    </PublicPageFrame>
  );
}
