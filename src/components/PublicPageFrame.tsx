'use client';

import type { ReactNode } from 'react';
import { CartProvider } from './CartProvider';
import SiteChrome from './SiteChrome';

export default function PublicPageFrame({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <SiteChrome>{children}</SiteChrome>
    </CartProvider>
  );
}
