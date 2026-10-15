'use client';

import { useState } from 'react';
import { submitOrder } from '@/lib/firestore';
import { useBusinessSettings } from './BusinessSettingsProvider';
import type { WebsiteProduct, OrderFormData } from '@/types/website';

interface OrderFormProps {
  product: WebsiteProduct;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function OrderForm({ product, onSuccess, onCancel }: OrderFormProps) {
  const { settings, loading: settingsLoading, error: settingsError } = useBusinessSettings();
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    productId: product.id,
    flavorName: product.flavors[0]?.name || '',
    sizeName: product.sizes[0]?.label || '',
    quantity: 1,
    deliveryAddress: '',
    deliveryArea: '',
    specialInstructions: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const selectedSize = product.sizes.find(s => s.label === formData.sizeName);
  const deliveryAreaName = formData.deliveryArea || settings?.deliveryAreas[0]?.name || '';
  const selectedArea = settings?.deliveryAreas.find(a => a.name === deliveryAreaName);

  const unitPrice = selectedSize?.basePrice || 0;
  const subtotal = unitPrice * formData.quantity;
  const deliveryFee = selectedArea?.deliveryFee || 0;
  const total = subtotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const orderNum = await submitOrder({ ...formData, deliveryArea: deliveryAreaName });
      setOrderNumber(orderNum);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setLoading(false);
    }
  };

  if (orderNumber) {
    return (
      <div className="surface mx-auto max-w-md p-8 text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full border border-[rgba(232,160,176,0.45)] bg-[rgba(183,110,121,0.2)]">
          <svg className="size-8 text-[var(--flomira-blush)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="eyebrow mb-2">Thank you</p>
        <h2 className="text-3xl font-semibold">Order placed</h2>
        <p className="muted mb-3 mt-3">Your order number is:</p>
        <p className="mb-6 font-mono text-xl font-bold tracking-wider text-[var(--flomira-copper)]">{orderNumber}</p>
        <p className="muted mb-6 text-sm leading-6">
          We&apos;ve received your order and will contact you shortly to confirm.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="button-secondary w-full"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="surface mx-auto max-w-2xl p-6 md:p-8">
      <p className="eyebrow mb-3">Made to order</p>
      <h2 className="text-3xl font-semibold tracking-tight">Order {product.name}</h2>
      <p className="muted mt-3 text-sm leading-6">Share a few details and we&apos;ll confirm availability, timing, and delivery with you.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <fieldset className="space-y-3">
          <legend className="mb-3 text-xl font-semibold">Customer information</legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="customer-name" className="field-label">Full name</label>
              <input
                id="customer-name"
                name="customerName"
                type="text"
                placeholder="Full Name"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                autoComplete="name"
                className="field w-full"
              />
            </div>
            <div>
              <label htmlFor="customer-phone" className="field-label">Phone number</label>
              <input
                id="customer-phone"
                name="customerPhone"
                type="tel"
                placeholder="Phone Number"
                required
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                autoComplete="tel"
                className="field w-full"
              />
            </div>
            <div>
              <label htmlFor="customer-email" className="field-label">Email address</label>
              <input
                id="customer-email"
                name="customerEmail"
                type="email"
                placeholder="Email Address"
                required
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                autoComplete="email"
                className="field w-full"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-3 text-xl font-semibold">Product details</legend>
          {product.flavors.length > 0 && (
            <div>
              <label htmlFor="order-flavor" className="field-label">Flavor</label>
              <select
                id="order-flavor"
                name="flavorName"
                required
                value={formData.flavorName}
                onChange={(e) => setFormData({ ...formData, flavorName: e.target.value })}
                className="field w-full"
              >
                {product.flavors.map((flavor) => (
                  <option key={flavor.name} value={flavor.name}>
                    {flavor.name}{flavor.description ? ` — ${flavor.description}` : ''}
                  </option>
                ))}
              </select>
              {product.flavors.find((flavor) => flavor.name === formData.flavorName)?.description && (
                <p className="muted mt-2 text-sm leading-6">
                  {product.flavors.find((flavor) => flavor.name === formData.flavorName)?.description}
                </p>
              )}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <div>
              <label htmlFor="order-size" className="field-label">Size</label>
              <select
                id="order-size"
                name="sizeName"
                required
                value={formData.sizeName}
                onChange={(e) => setFormData({ ...formData, sizeName: e.target.value })}
                className="field w-full"
              >
                {product.sizes.map((size) => (
                  <option key={size.id} value={size.label}>
                    {size.label} - {size.basePrice.toFixed(2)} TK
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="order-quantity" className="field-label">Quantity</label>
              <input
                id="order-quantity"
                name="quantity"
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="field w-full"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-3 text-xl font-semibold">Delivery information</legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="delivery-area" className="field-label">Delivery area</label>
              <select
                id="delivery-area"
                name="deliveryArea"
                required
                 value={deliveryAreaName}
                onChange={(e) => setFormData({ ...formData, deliveryArea: e.target.value })}
                className="field w-full"
              >
                {settingsLoading ? (
                  <option value="">Delivery areas are loading…</option>
                ) : settings?.deliveryAreas.length ? settings.deliveryAreas.map((area) => (
                  <option key={area.name} value={area.name}>
                    {area.name} - Delivery Fee: {area.deliveryFee.toFixed(2)} TK
                  </option>
                )) : (
                  <option value="">Delivery areas are not configured</option>
                )}
              </select>
            </div>

            {(settingsError || (!settingsLoading && !settings)) && (
              <p className="form-error" role="alert">
                {settingsError || 'Live ordering is not configured yet. Use the preview cart or contact FLOMIRA instead.'}
              </p>
            )}

            <div>
              <label htmlFor="delivery-address" className="field-label">Delivery address</label>
              <textarea
                id="delivery-address"
                name="deliveryAddress"
                placeholder="Street, building, and any helpful directions"
                required
                rows={3}
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                autoComplete="street-address"
                className="field w-full resize-y"
              />
            </div>

            <div>
              <label htmlFor="special-instructions" className="field-label">Special instructions <span className="font-normal normal-case tracking-normal text-[var(--flomira-muted)]">(optional)</span></label>
              <textarea
                id="special-instructions"
                name="specialInstructions"
                placeholder="A preferred time, inscription, or other note"
                rows={2}
                value={formData.specialInstructions}
                onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                className="field w-full resize-y"
              />
            </div>
          </div>
        </fieldset>

        <section className="border-t border-[var(--flomira-line)] pt-6" aria-labelledby="order-summary-title">
          <h3 id="order-summary-title" className="mb-4 text-xl font-semibold">Order summary</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="muted">Product</dt>
              <dd className="text-right">{product.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="muted">Size</dt>
              <dd>{formData.sizeName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="muted">Unit price</dt>
              <dd>{unitPrice.toFixed(2)} TK</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="muted">Quantity</dt>
              <dd>{formData.quantity}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="muted">Subtotal</dt>
              <dd>{subtotal.toFixed(2)} TK</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="muted">Delivery fee</dt>
              <dd>{deliveryFee.toFixed(2)} TK</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--flomira-line)] pt-4 text-lg font-semibold">
              <dt>Total</dt>
              <dd className="text-[var(--flomira-copper)]">{total.toFixed(2)} TK</dd>
            </div>
          </dl>
        </section>

        {product.allergens && product.allergens.length > 0 && (
          <div className="rounded-2xl border-l-4 border-[var(--flomira-copper)] bg-[rgba(201,154,128,0.1)] p-4" role="note">
            <div className="flex">
              <div className="shrink-0">
                <svg className="size-5 text-[var(--flomira-copper)]" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm leading-6 text-[var(--flomira-muted)]">
                  <span className="font-semibold text-[var(--flomira-blush)]">Allergen warning:</span> This product contains {product.allergens.join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="form-error" role="alert">
            <p className="text-sm leading-6">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="button-secondary flex-1"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || settingsLoading || Boolean(settingsError) || !settings?.deliveryAreas.length}
            className="button-primary flex-1"
          >
            {loading ? 'Placing order…' : settingsLoading ? 'Loading delivery options…' : !settings?.deliveryAreas.length || settingsError ? 'Ordering unavailable' : 'Place live order'}
          </button>
        </div>
      </form>
    </div>
  );
}
