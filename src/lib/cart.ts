import { getProduct } from '../data/catalog.ts';

export type CartItem = {
  id: string;
  productId: string;
  sizeId: string;
  flavor: string;
  message: string;
  quantity: number;
};

export const CART_STORAGE_KEY = 'flomira.preview.cart.v1';
export const FAVORITES_STORAGE_KEY = 'flomira.preview.favorites.v1';
export const MAX_CART_ITEMS = 30;
export const MAX_ITEM_QUANTITY = 12;
export const MAX_MESSAGE_LENGTH = 60;

type CartInput = Omit<CartItem, 'id'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeQuantity(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.trunc(value)));
}

function normalizeInput(value: unknown): CartInput | null {
  if (!isRecord(value) || typeof value.productId !== 'string') return null;
  const product = getProduct(value.productId);
  const quantity = normalizeQuantity(value.quantity);
  if (
    !product ||
    typeof value.sizeId !== 'string' ||
    !product.sizes.some((size) => size.id === value.sizeId) ||
    typeof value.flavor !== 'string' ||
    !product.flavors.includes(value.flavor) ||
    typeof value.message !== 'string' ||
    quantity === null
  ) return null;

  return {
    productId: product.id,
    sizeId: value.sizeId,
    flavor: value.flavor,
    message: value.message.trim().slice(0, MAX_MESSAGE_LENGTH),
    quantity,
  };
}

function sameSelection(left: CartInput, right: CartInput): boolean {
  return left.productId === right.productId &&
    left.sizeId === right.sizeId &&
    left.flavor === right.flavor &&
    left.message === right.message;
}

function nextLineId(items: readonly CartItem[]): string {
  let index = 1;
  while (items.some((item) => item.id === `cart-line-${index}`)) index += 1;
  return `cart-line-${index}`;
}

function validLineId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 160 &&
    value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
}

/** Restores only known selections; repairs bounds, repeated IDs, and duplicate lines. */
export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const result: CartItem[] = [];

  for (const candidate of value) {
    if (!isRecord(candidate) || !validLineId(candidate.id)) continue;
    const input = normalizeInput(candidate);
    if (!input) continue;
    const existing = result.find((item) => sameSelection(item, input));
    if (existing) {
      existing.quantity = Math.min(MAX_ITEM_QUANTITY, existing.quantity + input.quantity);
    } else if (result.length < MAX_CART_ITEMS) {
      const id = result.some((item) => item.id === candidate.id)
        ? nextLineId(result)
        : candidate.id;
      result.push({ id, ...input });
    }
  }

  return result;
}

export function sanitizeFavorites(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(
    (id): id is string => typeof id === 'string' && getProduct(id) !== undefined,
  ))];
}

export function getCartItemPrice(item: CartItem): number {
  if (!isRecord(item) || !validLineId(item.id)) return 0;
  const input = normalizeInput(item);
  if (!input || input.quantity !== item.quantity || input.message !== item.message) return 0;
  return getProduct(input.productId)?.sizes.find((size) => size.id === input.sizeId)?.price ?? 0;
}

export function getCartSubtotal(items: readonly CartItem[]): number {
  return sanitizeCart(items).reduce(
    (total, item) => total + getCartItemPrice(item) * item.quantity,
    0,
  );
}

/** Pure, deterministic addition. Only identical selections merge, capped at 12. */
export function addCartItem(items: readonly CartItem[], input: CartInput): CartItem[] {
  const current = sanitizeCart(items);
  const normalized = normalizeInput(input);
  // New user input must be an integer in range; stored numeric bounds are repaired above.
  if (!normalized || normalized.quantity !== input.quantity) return current;
  const existing = current.find((item) => sameSelection(item, normalized));
  if (existing) {
    return current.map((item) => item.id === existing.id
      ? { ...item, quantity: Math.min(MAX_ITEM_QUANTITY, item.quantity + normalized.quantity) }
      : item);
  }
  if (current.length >= MAX_CART_ITEMS) return current;
  return [...current, { id: nextLineId(current), ...normalized }];
}

export function setCartQuantity(items: readonly CartItem[], id: string, quantity: number): CartItem[] {
  const current = sanitizeCart(items);
  const boundedQuantity = normalizeQuantity(quantity);
  if (boundedQuantity === null) return current;
  return current.map((item) => item.id === id ? { ...item, quantity: boundedQuantity } : item);
}
