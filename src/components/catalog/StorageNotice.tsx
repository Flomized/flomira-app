'use client';

import { useCart } from '../CartProvider';

export function StorageNotice() {
  const { storageError } = useCart();
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {storageError && (
        <p className="mb-6 rounded-2xl border border-[#b76e79]/40 bg-[#b76e79]/10 p-4 text-sm leading-relaxed text-[#e0bdc3]">
          {storageError}
        </p>
      )}
    </div>
  );
}
