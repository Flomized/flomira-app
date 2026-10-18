'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatMoney, getProduct } from '../../data/catalog.ts';
import { getCartItemPrice, MAX_ITEM_QUANTITY } from '../../lib/cart.ts';
import { useCart } from '../CartProvider';
import { StorageNotice } from './StorageNotice';

export function CartView() {
  const { items, ready, subtotal, count, catalog, catalogError, updateQuantity, removeItem, clearCart } = useCart();
  const [feedback, setFeedback] = useState('');
  const leadTime = Math.max(0, ...items.map((item) => getProduct(item.productId, catalog)?.leadTimeDays ?? 0));

  function confirmClear() {
    if (window.confirm('Clear every item from your preview cart? Your favorites will stay saved.')) {
      clearCart();
      setFeedback('Your preview cart has been cleared.');
    }
  }

  return (
    <>
      <StorageNotice />
      {feedback && <p role="status" aria-live="polite" aria-atomic="true" className="surface mb-6 p-4 text-sm text-[#e0bdc3]">{feedback}</p>}
      {catalogError ? (
        <div className="surface p-8 text-center sm:p-12" role="alert">
          <p className="eyebrow mb-3">The collection is taking a moment</p>
          <p className="muted">{catalogError}</p>
        </div>
      ) : !ready ? (
        <div role="status" aria-busy="true" className="surface p-8 text-center sm:p-12">
          <p className="eyebrow mb-3">One moment</p>
          <p className="muted">Restoring your preview cart…</p>
        </div>
      ) : items.length === 0 ? (
        <section aria-labelledby="empty-cart-title" className="surface rounded-3xl px-6 py-16 text-center">
          <p className="eyebrow mb-4">Make room for something lovely</p>
          <h2 id="empty-cart-title" className="mb-4 text-3xl font-medium tracking-tight md:text-4xl">Your cart is a blank canvas.</h2>
          <p className="muted mx-auto mb-8 max-w-md leading-relaxed">Explore the collection, choose your sample options, and bring your sweet ideas together here.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/products" className="button-primary">Discover the collection</Link>
            <Link href="/favorites" className="button-secondary">Your favorites</Link>
          </div>
        </section>
      ) : (
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
          <section aria-label="Cart items" className="min-w-0">
            <div className="surface mb-4 flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
              <h2 className="text-xl font-medium">{count} {count === 1 ? 'item' : 'items'} in your preview</h2>
              <button type="button" onClick={confirmClear} className="button-secondary text-sm">Clear cart</button>
            </div>
            <ul className="space-y-4">
              {items.map((item) => {
                const product = getProduct(item.productId, catalog);
                if (!product) return null;
                const size = product.sizes.find((option) => option.id === item.sizeId);
                const unitPrice = getCartItemPrice(item, catalog);
                return (
                  <li key={item.id} className="surface flex gap-4 p-4 sm:gap-6 sm:p-6">
                    <Link href={`/products/${product.slug}`} className="relative block aspect-[4/5] h-28 shrink-0 overflow-hidden rounded-xl bg-[#171414] sm:h-36" aria-label={`View ${product.name}`}>
                      {product.image ? (
                        <Image src={product.image} alt={product.imageAlt} fill sizes="(min-width: 640px) 116px, 90px" loading="lazy" className="object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center px-2 text-center text-xs text-[#aaaaaa]">Image coming soon</span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-lg font-medium tracking-tight sm:text-xl"><Link href={`/products/${product.slug}`} className="hover:text-[#cba0a5]">{product.name}</Link></h3>
                        <p className="text-base text-[#e0bdc3]">{formatMoney(unitPrice * item.quantity)}</p>
                      </div>
                      <p className="muted mt-2 text-sm">{size?.label} · {item.flavor}</p>
                      <p className="muted mt-1 text-xs">{formatMoney(unitPrice)} sample price each</p>
                      {item.message && <p className="muted mt-3 break-words text-sm leading-relaxed">Preview note: <span className="text-white">“{item.message}”</span></p>}
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <div className="flex items-center gap-2">
                          <label htmlFor={`quantity-${item.id}`} className="muted text-xs">Quantity<span className="sr-only"> for {product.name}, {size?.label}, {item.flavor}{item.message ? `, note ${item.message}` : ''}</span></label>
                          <select
                            id={`quantity-${item.id}`}
                            value={item.quantity}
                            onChange={(event) => {
                              updateQuantity(item.id, Number(event.target.value));
                              setFeedback(`Quantity updated for ${product.name}.`);
                            }}
                            className="field min-h-11 w-20"
                          >
                            {Array.from({ length: MAX_ITEM_QUANTITY }, (_, index) => index + 1).map((amount) => <option key={amount} value={amount}>{amount}</option>)}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => { removeItem(item.id); setFeedback(`${product.name} removed from your preview cart.`); }}
                          aria-label={`Remove ${product.name}, ${size?.label}, ${item.flavor}${item.message ? `, note ${item.message}` : ''} from cart`}
                          className="button-secondary text-sm"
                        >Remove</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link href="/products" className="button-secondary mt-5"><span aria-hidden="true">←&nbsp;</span> Continue exploring</Link>
          </section>

          <aside aria-labelledby="cart-estimate" className="surface rounded-3xl p-6 md:p-8">
            <p className="eyebrow mb-3">Just imagining, for now</p>
            <h2 id="cart-estimate" className="mb-7 text-2xl font-medium tracking-tight">Your sample estimate</h2>
            <dl className="space-y-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="muted">Items subtotal</dt><dd>{formatMoney(subtotal)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="muted">Taxes</dt><dd className="muted text-right">Not calculated</dd></div>
              <div className="flex justify-between gap-4"><dt className="muted">Delivery / pickup</dt><dd className="muted text-right">Not configured</dd></div>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-5 text-lg"><dt>Sample subtotal</dt><dd className="text-[#e0bdc3]">{formatMoney(subtotal)}</dd></div>
            </dl>
            <p className="muted mt-3 text-xs leading-relaxed">TK · This is not a final quote. Taxes and fulfillment charges are not included.</p>
            <p className="muted my-6 border-y border-white/10 py-5 text-sm leading-relaxed">Sample preparation estimate: {leadTime} days. This illustrative lead time does not reserve a date or confirm availability.</p>
            <Link href="/checkout" className="button-primary w-full text-center">Preview checkout <span aria-hidden="true">→</span></Link>
            <p className="muted mt-4 text-center text-xs leading-relaxed">No submission or payment. Continue to review the preview flow.</p>
            <p className="mt-6 text-center text-sm"><Link href="/faq" className="text-[#cba0a5] underline underline-offset-4">Questions about the preview?</Link></p>
          </aside>
        </div>
      )}
    </>
  );
}
