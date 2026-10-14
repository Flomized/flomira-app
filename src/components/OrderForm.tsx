'use client';

import { useState, useEffect } from 'react';
import { submitOrder, getBusinessSettings } from '@/lib/firestore';
import type { WebsiteProduct, BusinessSettings, OrderFormData } from '@/types/website';

interface OrderFormProps {
  product: WebsiteProduct;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function OrderForm({ product, onSuccess, onCancel }: OrderFormProps) {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    productId: product.id,
    flavorName: '',
    sizeName: product.sizes[0]?.name || '',
    quantity: 1,
    deliveryAddress: '',
    deliveryArea: '',
    specialInstructions: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      const data = await getBusinessSettings();
      setSettings(data);
      if (data && data.deliveryAreas.length > 0) {
        setFormData(prev => ({ ...prev, deliveryArea: data.deliveryAreas[0].name }));
      }
    }
    fetchSettings();
  }, []);

  const selectedSize = product.sizes.find(s => s.name === formData.sizeName);
  const selectedArea = settings?.deliveryAreas.find(a => a.name === formData.deliveryArea);

  const unitPrice = selectedSize?.price || 0;
  const subtotal = unitPrice * formData.quantity;
  const deliveryFee = selectedArea?.deliveryFee || 0;
  const total = subtotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const orderNum = await submitOrder(formData);
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
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
        <p className="text-gray-600 mb-4">Your order number is:</p>
        <p className="text-xl font-mono font-bold text-blue-600 mb-6">{orderNumber}</p>
        <p className="text-sm text-gray-500 mb-6">
          We've received your order and will contact you shortly to confirm.
        </p>
        <button
          onClick={onCancel}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Order {product.name}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Information */}
        <div>
          <h3 className="font-semibold mb-3">Customer Information</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Full Name"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              required
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="email"
              placeholder="Email Address"
              required
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Product Details */}
        <div>
          <h3 className="font-semibold mb-3">Product Details</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Size</label>
              <select
                required
                value={formData.sizeName}
                onChange={(e) => setFormData({ ...formData, sizeName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {product.sizes.map((size) => (
                  <option key={size.id} value={size.name}>
                    {size.name} - {size.price.toFixed(2)} TK
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div>
          <h3 className="font-semibold mb-3">Delivery Information</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Delivery Area</label>
              <select
                required
                value={formData.deliveryArea}
                onChange={(e) => setFormData({ ...formData, deliveryArea: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {settings?.deliveryAreas.map((area) => (
                  <option key={area.name} value={area.name}>
                    {area.name} - Delivery Fee: {area.deliveryFee.toFixed(2)} TK
                  </option>
                ))}
              </select>
            </div>

            <textarea
              placeholder="Delivery Address"
              required
              rows={3}
              value={formData.deliveryAddress}
              onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <textarea
              placeholder="Special Instructions (optional)"
              rows={2}
              value={formData.specialInstructions}
              onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Product:</span>
              <span>{product.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Size:</span>
              <span>{formData.sizeName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Unit Price:</span>
              <span>{unitPrice.toFixed(2)} TK</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Quantity:</span>
              <span>{formData.quantity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{subtotal.toFixed(2)} TK</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Delivery Fee:</span>
              <span>{deliveryFee.toFixed(2)} TK</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{total.toFixed(2)} TK</span>
            </div>
          </div>
        </div>

        {/* Allergen Warning */}
        {product.allergens && product.allergens.length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-700">
                  <span className="font-medium">Allergen Warning:</span> This product contains {product.allergens.join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !settings}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
