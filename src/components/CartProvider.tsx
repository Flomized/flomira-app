'use client';

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { getProduct, websiteProductsToCatalog, type Product } from '../data/catalog.ts';
import { getProducts } from '../lib/firestore.ts';
import {
  addCartItem,
  CART_STORAGE_KEY,
  FAVORITES_STORAGE_KEY,
  getCartSubtotal,
  sanitizeCart,
  sanitizeFavorites,
  setCartQuantity,
  type CartItem,
} from '../lib/cart.ts';

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotal: number;
  favorites: string[];
  catalog: Product[];
  catalogReady: boolean;
  catalogError: string | null;
  storageError: string | null;
  addItem(input: Omit<CartItem, 'id'>): boolean;
  updateQuantity(id: string, quantity: number): void;
  removeItem(id: string): void;
  clearCart(): void;
  toggleFavorite(productId: string): void;
};

type Snapshot = Pick<CartContextValue, 'items' | 'favorites' | 'catalog' | 'catalogReady' | 'catalogError' | 'ready' | 'storageError'>;

const INITIAL_SNAPSHOT: Snapshot = {
  items: [],
  favorites: [],
  catalog: [],
  catalogReady: false,
  catalogError: null,
  ready: false,
  storageError: null,
};

const STORAGE_WARNING = 'Browser storage is unavailable. Your cart and favorites still work in this tab, but may not be saved when you leave.';
const RESTORE_WARNING = 'Some saved preview selections could not be restored and were reset. Please review your cart and favorites.';

function createCartStore() {
  let snapshot: Snapshot = INITIAL_SNAPSHOT;
  const listeners = new Set<() => void>();
  const storageIssues = new Map<string, string>();

  function publish(next: Snapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function errorMessage() {
    return [...new Set(storageIssues.values())].join(' ') || null;
  }

  function readStored<T>(key: string, sanitize: (value: unknown) => T, fallback: T): T {
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      storageIssues.set(key, STORAGE_WARNING);
      return fallback;
    }

    try {
      const parsed: unknown = raw === null ? [] : JSON.parse(raw);
      const clean = sanitize(parsed);
      if (JSON.stringify(parsed) !== JSON.stringify(clean)) {
        storageIssues.set(key, RESTORE_WARNING);
      } else {
        storageIssues.delete(key);
      }
      return clean;
    } catch {
      storageIssues.set(key, RESTORE_WARNING);
      return sanitize(null);
    }
  }

  // Persistence happens only after a user mutation, never with the empty
  // hydration snapshot. A failed write does not discard the in-memory result.
  function persist(key: string, value: CartItem[] | string[]) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      storageIssues.delete(key);
    } catch {
      storageIssues.set(key, STORAGE_WARNING);
    }
  }

  function saveItems(items: CartItem[]) {
    persist(CART_STORAGE_KEY, items);
    publish({ ...snapshot, items, storageError: errorMessage() });
  }

  function restore(key?: string | null) {
    if (!snapshot.catalogReady) return;
    const items = !key || key === CART_STORAGE_KEY
      ? readStored(CART_STORAGE_KEY, (value) => sanitizeCart(value, snapshot.catalog), snapshot.items)
      : snapshot.items;
    const favorites = !key || key === FAVORITES_STORAGE_KEY
      ? readStored(FAVORITES_STORAGE_KEY, (value) => sanitizeFavorites(value, snapshot.catalog), snapshot.favorites)
      : snapshot.favorites;
    publish({ ...snapshot, items, favorites, ready: true, storageError: errorMessage() });
  }

  async function loadCatalog() {
    try {
      const liveProducts = await getProducts();
      const catalog = websiteProductsToCatalog(liveProducts);
      publish({ ...snapshot, catalog, catalogReady: true, catalogError: null });
      restore();
    } catch {
      publish({
        ...snapshot,
        catalogReady: true,
        catalogError: 'The live product catalog could not be loaded. Refresh to try again.',
      });
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => INITIAL_SNAPSHOT,
    loadCatalog,
    restore,
    addItem(input: Omit<CartItem, 'id'>): boolean {
      if (!snapshot.ready || !snapshot.catalogReady) return false;
      const next = addCartItem(snapshot.items, input, snapshot.catalog);
      const previousCount = snapshot.items.reduce((total, item) => total + item.quantity, 0);
      const nextCount = next.reduce((total, item) => total + item.quantity, 0);
      // Refuse the whole request if it would exceed a line/cart limit, so
      // feedback never claims that a partially added quantity was accepted.
      if (nextCount - previousCount !== input.quantity || nextCount === previousCount) return false;
      saveItems(next);
      return true;
    },
    updateQuantity(id: string, quantity: number) {
      if (snapshot.ready) saveItems(setCartQuantity(snapshot.items, id, quantity, snapshot.catalog));
    },
    removeItem(id: string) {
      if (snapshot.ready) saveItems(snapshot.items.filter((item) => item.id !== id));
    },
    clearCart() {
      if (snapshot.ready) saveItems([]);
    },
    toggleFavorite(productId: string) {
      if (!snapshot.ready || !getProduct(productId, snapshot.catalog)) return;
      const favorites = snapshot.favorites.includes(productId)
        ? snapshot.favorites.filter((id) => id !== productId)
        : [...snapshot.favorites, productId];
      persist(FAVORITES_STORAGE_KEY, favorites);
      publish({ ...snapshot, favorites, storageError: errorMessage() });
    },
  };
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createCartStore);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  useEffect(() => {
    void store.loadCatalog();
    function synchronize(event: StorageEvent) {
      if (event.key !== null && event.key !== CART_STORAGE_KEY && event.key !== FAVORITES_STORAGE_KEY) return;
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return;
      } catch {
        // restore() reports storage failure while preserving in-memory data.
      }
      store.restore(event.key);
    }
    window.addEventListener('storage', synchronize);
    return () => window.removeEventListener('storage', synchronize);
  }, [store]);

  const value: CartContextValue = {
    ...snapshot,
    count: snapshot.items.reduce((total, item) => total + item.quantity, 0),
    subtotal: getCartSubtotal(snapshot.items, snapshot.catalog),
    addItem: store.addItem,
    updateQuantity: store.updateQuantity,
    removeItem: store.removeItem,
    clearCart: store.clearCart,
    toggleFavorite: store.toggleFavorite,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider.');
  return context;
}
