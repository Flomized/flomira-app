"use client";

import {
  deserializeOrderDrafts, DRAFT_STORAGE_KEY, MAX_DRAFTS, serializeOrderDrafts,
  type OrderDraft,
} from "../../lib/orders.ts";

const CHANGED_EVENT = "flomira:drafts-changed";
export const STORAGE_LOADING = "__flomira_drafts_loading__";
export const STORAGE_UNAVAILABLE = "__flomira_drafts_unavailable__";

export function subscribeToDrafts(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === DRAFT_STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGED_EVENT, listener);
  window.addEventListener("focus", listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGED_EVENT, listener);
    window.removeEventListener("focus", listener);
  };
}

export function getDraftStorageSnapshot(): string {
  try { return window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? ""; }
  catch { return STORAGE_UNAVAILABLE; }
}

export function getDraftServerSnapshot(): string { return STORAGE_LOADING; }

function readWritableDrafts(): OrderDraft[] {
  let raw: string | null;
  try { raw = window.localStorage.getItem(DRAFT_STORAGE_KEY); }
  catch { throw new Error("Browser storage is unavailable. Enable local storage to save a draft, or print your review instead."); }
  const parsed = deserializeOrderDrafts(raw);
  if (parsed.invalid) throw new Error("Existing draft data could not be read safely. Visit Saved drafts to review and clear it before saving.");
  return parsed.drafts;
}

function writeAndVerify(drafts: OrderDraft[]): OrderDraft[] {
  const serialized = serializeOrderDrafts(drafts);
  try { window.localStorage.setItem(DRAFT_STORAGE_KEY, serialized); }
  catch { throw new Error("The draft could not be saved to this browser. Storage may be full or blocked. Your review is still here; you can print it."); }
  let stored: string | null;
  try { stored = window.localStorage.getItem(DRAFT_STORAGE_KEY); }
  catch { throw new Error("A storage write was attempted, but it could not be verified. Check Saved drafts before trying again."); }
  if (stored !== serialized) throw new Error("The storage write could not be confirmed. Check Saved drafts before trying again.");
  const verified = deserializeOrderDrafts(stored);
  if (verified.invalid) throw new Error("The stored draft could not be verified. Check Saved drafts before trying again.");
  window.dispatchEvent(new Event(CHANGED_EVENT));
  return verified.drafts;
}

export function newDraftReference(): string {
  if (!window.crypto?.getRandomValues) throw new Error("This browser could not create a unique draft reference. Try an up-to-date browser.");
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  return `FLO-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** Called only after explicit storage consent. A reference makes retrying idempotent. */
export function saveDraftLocally(draft: OrderDraft): OrderDraft {
  const drafts = readWritableDrafts();
  const existing = drafts.find((item) => item.reference === draft.reference);
  if (existing) {
    const sameDetails = serializeOrderDrafts([{ ...draft, createdAt: existing.createdAt }]) === serializeOrderDrafts([existing]);
    if (!sameDetails) throw new Error("This draft reference is already in use. Review your details again.");
    return existing;
  }
  if (drafts.length >= MAX_DRAFTS) throw new Error(`This browser already has ${MAX_DRAFTS} drafts. Remove one in Saved drafts before saving another.`);
  const verified = writeAndVerify([draft, ...drafts]);
  const saved = verified.find((item) => item.reference === draft.reference);
  if (!saved) throw new Error("Saving could not be confirmed. Check Saved drafts before trying again.");
  return saved;
}

export function removeDraftLocally(reference: string): void {
  const drafts = readWritableDrafts();
  writeAndVerify(drafts.filter((draft) => draft.reference !== reference));
}

export function clearDraftsLocally(): void {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    if (window.localStorage.getItem(DRAFT_STORAGE_KEY) !== null) throw new Error("Verification failed");
  } catch { throw new Error("The saved details could not be cleared from this browser. Check browser storage settings and try again."); }
  window.dispatchEvent(new Event(CHANGED_EVENT));
}
