'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { formatMoney, type Product } from '../../data/catalog.ts';
import { MAX_CART_ITEMS, MAX_ITEM_QUANTITY, MAX_MESSAGE_LENGTH } from '../../lib/cart.ts';
import { useCart } from '../CartProvider';
import { FavoriteButton } from './FavoriteButton';
import { PreviewNote } from './PreviewNote';
import { StorageNotice } from './StorageNotice';

export function ProductDetail({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addItem, ready, catalogError } = useCart();
  const [sizeId, setSizeId] = useState(product.sizes[0].id);
  const [flavor, setFlavor] = useState(product.flavors[0]);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);
  const selectedSize = product.sizes.find((size) => size.id === sizeId) ?? product.sizes[0];
  const sampleTotal = selectedSize.price * quantity;

  function addToCart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const added = addItem({ productId: product.id, sizeId, flavor, quantity, message });
    setFeedback(added ? {
      success: true,
      text: `${quantity} × ${product.name} added to your preview cart.`,
    } : {
      success: false,
      text: `This selection could not be added. Your preview cart can hold ${MAX_ITEM_QUANTITY} of the same selection and ${MAX_CART_ITEMS} different selections. Try a lower quantity or review your cart.`,
    });
  }

  return (
    <>
      <StorageNotice />
      <div className={compact ? 'min-w-0' : 'grid items-start gap-10 lg:grid-cols-2 lg:gap-16'}>
        {!compact && (
          <figure className="min-w-0">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#171414]">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.imageAlt}
                  fill
                  sizes="(min-width: 1280px) 580px, (min-width: 1024px) 46vw, 90vw"
                  loading="lazy"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#aaaaaa]">Image coming soon</div>
              )}
              <span className="absolute bottom-5 left-5 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs tracking-wide text-white backdrop-blur-sm">Collection inspiration</span>
            </div>
            <figcaption className="mt-4 max-w-lg text-xs leading-relaxed text-[#aaaaaa]">
              An editorial image illustrating the FLOMIRA collection, not a photograph of this finished product.
              Imagery may be shared across concepts.
            </figcaption>
          </figure>
        )}

        <div className="min-w-0">
          {!compact && (
            <>
              <p className="eyebrow mb-4">{product.category} · Concept preview</p>
              <h1 className="mb-5 text-4xl font-medium leading-[1.08] tracking-tight md:text-5xl xl:text-6xl">{product.name}</h1>
              <p className="mb-6 text-lg leading-relaxed text-[#aaaaaa]">{product.description}</p>
              <PreviewNote />
            </>
          )}

          <form onSubmit={addToCart} className="mt-8 space-y-6 border-t border-white/10 pt-8">
            <fieldset>
              <legend className="field-label mb-3">Choose a sample size</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {product.sizes.map((size) => (
                  <label key={size.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${sizeId === size.id ? 'border-[#cba0a5] bg-[#b76e79]/10' : 'border-white/15 hover:border-white/40'}`}>
                    <input
                      type="radio"
                      name="product-size"
                      value={size.id}
                      checked={sizeId === size.id}
                      onChange={() => { setSizeId(size.id); setFeedback(null); }}
                      className="mt-1 size-4 shrink-0 accent-[#cba0a5]"
                    />
                    <span className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{size.label}</span>
                      <span className="text-xs leading-relaxed text-[#aaaaaa]">{size.servings}</span>
                      <span className="mt-1 text-sm text-[#e0bdc3]">{formatMoney(size.price)} sample</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
              <div>
                <label htmlFor="product-flavor" className="field-label">Sample flavor</label>
                <select id="product-flavor" value={flavor} onChange={(event) => { setFlavor(event.target.value); setFeedback(null); }} className="field w-full">
                  {product.flavors.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="product-quantity" className="field-label">Quantity</label>
                <select id="product-quantity" value={quantity} onChange={(event) => { setQuantity(Number(event.target.value)); setFeedback(null); }} className="field w-full">
                  {Array.from({ length: MAX_ITEM_QUANTITY }, (_, index) => index + 1).map((amount) => <option key={amount} value={amount}>{amount}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="product-message" className="field-label">A few personal words <span className="text-[#aaaaaa]">(optional)</span></label>
              <textarea
                id="product-message"
                value={message}
                onChange={(event) => { setMessage(event.target.value); setFeedback(null); }}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={2}
                placeholder="An inscription or a little gift note…"
                aria-describedby="product-message-help product-message-count"
                className="field w-full resize-y"
              />
              <div className="mt-2 flex items-start justify-between gap-4 text-xs leading-relaxed text-[#aaaaaa]">
                <p id="product-message-help">A preview note only. Final personalization would need confirmation.</p>
                <p id="product-message-count" className="shrink-0">{message.length}/{MAX_MESSAGE_LENGTH}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.16em] text-[#aaaaaa]">Sample item total · TK</p>
                <output aria-live="polite" aria-label="Sample item total" className="text-3xl font-medium tracking-tight">{formatMoney(sampleTotal)}</output>
                <p className="mt-1 text-xs text-[#aaaaaa]">{quantity} × {formatMoney(selectedSize.price)} · taxes and delivery not calculated</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="submit" className="button-primary flex-1 disabled:cursor-wait disabled:opacity-50" disabled={!ready || Boolean(catalogError)}>
                {catalogError ? 'Live catalog unavailable' : ready ? 'Add to preview cart' : 'Restoring your cart…'}
              </button>
              <FavoriteButton productId={product.id} name={product.name} showLabel />
            </div>
            {catalogError && <p className="form-error" role="alert">{catalogError}</p>}
            <div aria-live="polite" aria-atomic="true" className="min-h-6 text-sm leading-relaxed">
              {feedback && (
                <p className={feedback.success ? 'text-[#e0bdc3]' : 'form-error'}>
                  {feedback.text}{' '}
                  <Link href="/cart" className="font-medium underline underline-offset-4">View cart</Link>
                </p>
              )}
            </div>
          </form>

          <dl className="mt-6 space-y-5 border-t border-white/10 pt-7 text-sm">
            <div>
              <dt className="mb-1 font-medium">Sample preparation time</dt>
              <dd className="leading-relaxed text-[#aaaaaa]">{product.leadTimeDays} days, for preview planning only. Availability and dates are not confirmed.</dd>
            </div>
            <div>
              <dt className="mb-1 font-medium">Illustrative allergen information</dt>
              <dd className="leading-relaxed text-[#aaaaaa]">
                Sample recipe allergens: {product.allergens.join(', ')}. Recipes and cross-contact information are unverified; this is not a dietary guarantee.
                {' '}<Link href="/contact" className="text-[#cba0a5] underline underline-offset-4">Contact FLOMIRA</Link> to discuss dietary requirements before any future order.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}
