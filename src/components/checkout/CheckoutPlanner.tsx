"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useCart } from "@/components/CartProvider";
import { formatMoney } from "@/data/catalog";
import {
  cartFingerprint, createOrderDraft, EMPTY_ORDER_DETAILS, formatRequestedDate,
  getDateBounds, getDraftSubtotal, getOrderItems, MAX_DRAFTS, ORDER_LIMITS,
  REQUESTED_WINDOWS, validateOrderDetails, type OrderDetails, type OrderDraft, type OrderErrors,
} from "@/lib/orders";
import OrderSummary, { type OrderSummaryData } from "./OrderSummary";
import { newDraftReference, removeDraftLocally, saveDraftLocally } from "./draft-storage";
import { useLocalToday } from "./use-local-today";

type Review = OrderSummaryData & { fingerprint: string };

function Field({ name, label, error, hint, children }: {
  name: string; label: string; error?: string; hint?: string; children: ReactNode;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={`order-${name}`}>{label}</label>
      {hint && <p className="muted mb-2 text-sm leading-relaxed" id={`order-${name}-hint`}>{hint}</p>}
      {children}
      {error && <p className="form-error mt-2" id={`order-${name}-error`}>{error}</p>}
    </div>
  );
}

export default function CheckoutPlanner() {
  const cart = useCart();
  const today = useLocalToday();
  const [details, setDetails] = useState<OrderDetails>({ ...EMPTY_ORDER_DETAILS });
  const [errors, setErrors] = useState<OrderErrors>({});
  const [review, setReview] = useState<Review | null>(null);
  const [consent, setConsent] = useState(false);
  const [saved, setSaved] = useState<OrderDraft | null>(null);
  const [operationError, setOperationError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const pendingReference = useRef<string | null>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const currentFingerprint = cartFingerprint(cart.items);
  const staleReview = Boolean(review && review.fingerprint !== currentFingerprint);

  useEffect(() => { if (Object.keys(errors).length) errorSummary.current?.focus(); }, [errors]);
  useEffect(() => { if (review || saved) stepHeading.current?.focus(); }, [review, saved]);

  function update<K extends keyof OrderDetails>(key: K, value: OrderDetails[K]) {
    setDetails((current) => ({ ...current, [key]: value, ...(key === "fulfillment" && value !== "delivery" ? { address: "" } : {}) }));
    setNotice("");
  }

  function inputProps(key: keyof OrderDetails, hasHint = false) {
    return {
      id: `order-${key}`, name: key, className: "field w-full",
      "aria-invalid": Boolean(errors[key]),
      "aria-describedby": [hasHint ? `order-${key}-hint` : "", errors[key] ? `order-${key}-error` : ""].filter(Boolean).join(" ") || undefined,
    };
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOperationError("");
    const checked = validateOrderDetails(details, cart.items, new Date());
    setErrors(checked.errors);
    if (!checked.valid) return;
    const items = getOrderItems(cart.items);
    setDetails(checked.details);
    setReview({ details: checked.details, items, sampleSubtotalCents: getDraftSubtotal(items), fingerprint: cartFingerprint(cart.items) });
    setConsent(false);
    setNotice("");
    pendingReference.current = null;
  }

  function editDetails() {
    setReview(null);
    setConsent(false);
    setOperationError("");
    pendingReference.current = null;
    window.setTimeout(() => document.getElementById("order-name")?.focus(), 0);
  }

  function saveDraft() {
    if (saveLock.current || saved) return;
    setOperationError("");
    if (!review || review.fingerprint !== cartFingerprint(cart.items)) {
      setOperationError("Your cart has changed. Return to details and review the updated selections before saving.");
      return;
    }
    if (!consent) {
      setOperationError("Give permission to store these personal details on this device before saving a draft.");
      document.getElementById("storage-consent")?.focus();
      return;
    }
    const checked = validateOrderDetails(review.details, cart.items, new Date());
    if (!checked.valid) {
      setErrors(checked.errors);
      setReview(null);
      setConsent(false);
      return;
    }
    saveLock.current = true;
    setSaving(true);
    try {
      pendingReference.current ??= newDraftReference();
      const draft = createOrderDraft(review.details, cart.items, { now: new Date(), reference: pendingReference.current });
      const verified = saveDraftLocally(draft);
      setSaved(verified);
      setNotice("Draft saved and read back successfully on this browser. It has not been submitted.");
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "The draft could not be saved. Your review is still here.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  function clearDetails() {
    if (!window.confirm(saved
      ? "Remove this saved draft from this browser and clear the personal details in this form?"
      : "Clear all personal details and requested arrangements in this form?")) return;
    try {
      if (saved) removeDraftLocally(saved.reference);
      setDetails({ ...EMPTY_ORDER_DETAILS });
      setSaved(null);
      setReview(null);
      setErrors({});
      setConsent(false);
      setOperationError("");
      pendingReference.current = null;
      setNotice("These draft details have been cleared. Manage any other saved drafts on the Saved drafts page.");
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "The saved details could not be removed.");
    }
  }

  function printSummary() {
    try { window.print(); }
    catch { setOperationError("The print dialog could not open. Use your browser’s Print command to print this summary."); }
  }

  if (!cart.ready || !today) return <div className="surface p-8" role="status">Loading your local planner…</div>;

  if (saved) return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="print-exclude surface border border-[#b76e79]/40 p-6 sm:p-8">
        <p className="eyebrow mb-3">Saved on this browser</p>
        <h2 className="text-3xl font-semibold tracking-tight outline-none" ref={stepHeading} tabIndex={-1}>A little closer to your celebration.</h2>
        <p className="mt-4 leading-relaxed" role="status">{notice}</p>
        <p className="muted mt-3 leading-relaxed">Your draft is not an order. No business has received these details, and no date, price, or payment has been confirmed.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="button-primary" href="/orders">View saved drafts</Link>
          <button className="button-secondary" type="button" onClick={printSummary}>Print / save as PDF</button>
        </div>
        <p className="muted mt-3 text-sm">A printed or downloaded copy contains personal information. Keep it somewhere private.</p>
      </div>
      {operationError && <p className="form-error print-exclude" role="alert">{operationError}</p>}
      <OrderSummary order={saved} />
      <div className="print-exclude flex flex-wrap gap-3">
        <button className="button-secondary" type="button" onClick={clearDetails}>Remove this draft & clear details</button>
        <Link className="button-secondary" href="/products">Explore more cakes</Link>
      </div>
    </div>
  );

  if (!cart.items.length) return (
    <div className="surface mx-auto max-w-2xl p-8 text-center sm:p-12">
      <p className="eyebrow mb-4">Your celebration starts here</p>
      <h2 className="text-3xl font-semibold">A cake is the first ingredient.</h2>
      <p className="muted mt-4 text-lg leading-relaxed">Your cart is empty. Choose a cake and its options to create a local order draft.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/products" className="button-primary">Explore the collection</Link><Link href="/orders" className="button-secondary">View saved drafts</Link></div>
    </div>
  );

  const bounds = getDateBounds(cart.items, new Date(`${today}T12:00:00`));

  return (
    <div className="space-y-8">
      <ol className="print-exclude flex flex-wrap gap-6 text-sm" aria-label="Draft steps">
        <li aria-current={!review || staleReview ? "step" : undefined} className={!review || staleReview ? "text-[#cba0a5]" : "muted"}>01 · Requested details</li>
        <li aria-current={review && !staleReview ? "step" : undefined} className={review && !staleReview ? "text-[#cba0a5]" : "muted"}>02 · Review & save locally</li>
      </ol>
      {notice && <p className="surface print-exclude p-4" role="status">{notice}</p>}
      {cart.storageError && <p className="form-error print-exclude" role="alert">{cart.storageError}</p>}

      {review && !staleReview ? (
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="print-exclude">
            <h2 className="text-3xl font-semibold outline-none" ref={stepHeading} tabIndex={-1}>One last look.</h2>
            <p className="muted mt-3 text-lg">Check the details below. Saving creates a draft on this browser only.</p>
          </div>
          <OrderSummary order={review} />
          <div className="print-exclude surface space-y-5 p-6 sm:p-8">
            <h3 className="text-xl font-semibold">Your details, your device.</h3>
            <p className="muted leading-relaxed">Saving stores your name, contact details, address if provided, requests, and cake selections in this browser’s local storage. Anyone using this browser profile may be able to see them. Avoid saving on a shared device. Up to {MAX_DRAFTS} drafts can be kept; clearing browser data will remove them.</p>
            <label className="flex cursor-pointer items-start gap-3 leading-relaxed" htmlFor="storage-consent">
              <input id="storage-consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1.5 h-5 w-5 shrink-0 accent-[#b76e79]" />
              <span>I consent to storing this draft and its personal details on this device. I can remove it from Saved drafts.</span>
            </label>
            {operationError && <p className="form-error" role="alert">{operationError}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="button" className="button-primary" disabled={saving || staleReview} onClick={saveDraft}>{saving ? "Saving locally…" : "Save draft on this device"}</button>
              <button type="button" className="button-secondary" onClick={editDetails}>Back to details</button>
              <button type="button" className="button-secondary" disabled={staleReview} onClick={printSummary}>Print review</button>
            </div>
            <Link className="inline-block text-sm text-[#cba0a5] underline underline-offset-4" href="/orders">Manage saved drafts</Link>
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form className="surface space-y-8 p-6 sm:p-8" onSubmit={handleReview} noValidate>
            <div>
              <h2 className="text-2xl font-semibold">Tell us what you’re imagining.</h2>
              <p className="muted mt-3 leading-relaxed">Fields marked * are required for your draft. Details stay in this page until you explicitly choose to save them.</p>
            </div>
            {staleReview && <div className="form-error surface p-5" role="alert">Your cart changed since the last review. Review the updated selections before saving.</div>}
            {Object.keys(errors).length > 0 && <div className="rounded-2xl border border-[#cba0a5]/50 p-5 outline-none" role="alert" tabIndex={-1} ref={errorSummary}>
              <h3 className="font-semibold">A few details need your attention.</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                {Object.entries(errors).map(([key, message]) => <li key={key}>{key === "cart" ? <Link href="/cart" className="underline">{message}</Link> : <a href={`#order-${key}`} className="underline underline-offset-4">{message}</a>}</li>)}
              </ul>
            </div>}
            <fieldset className="space-y-5">
              <legend className="mb-5 text-lg font-semibold">01 · Customer details</legend>
              <Field name="name" label="Full name *" error={errors.name}><input {...inputProps("name")} type="text" autoComplete="name" required maxLength={ORDER_LIMITS.name} value={details.name} onChange={(event) => update("name", event.target.value)} /></Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field name="email" label="Email *" error={errors.email}><input {...inputProps("email")} type="email" autoComplete="email" required maxLength={ORDER_LIMITS.email} value={details.email} onChange={(event) => update("email", event.target.value)} /></Field>
                <Field name="phone" label="Phone *" error={errors.phone}><input {...inputProps("phone")} type="tel" autoComplete="tel" required maxLength={ORDER_LIMITS.phone} value={details.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
              </div>
            </fieldset>
            <fieldset className="space-y-5 border-t border-white/10 pt-7">
              <legend className="mb-2 pr-4 text-lg font-semibold">02 · Requested arrangements</legend>
              <Field name="fulfillment" label="Requested preference *" error={errors.fulfillment} hint="Delivery area, pickup location, and availability are to be confirmed before launch.">
                <select {...inputProps("fulfillment", true)} required value={details.fulfillment} onChange={(event) => update("fulfillment", event.target.value as OrderDetails["fulfillment"])}>
                  <option value="">Choose a preference</option><option value="pickup">Pickup requested</option><option value="delivery">Delivery requested</option>
                </select>
              </Field>
              {details.fulfillment === "delivery" && <Field name="address" label="Requested delivery address *" error={errors.address} hint="Include street, city, and postal code. This does not confirm that delivery is available.">
                <textarea {...inputProps("address", true)} autoComplete="street-address" rows={3} required maxLength={ORDER_LIMITS.address} value={details.address} onChange={(event) => update("address", event.target.value)} />
              </Field>}
              <Field name="date" label="Desired date *" error={errors.date} hint={`This cart has a ${bounds.leadTimeDays}-day sample lead time. Request ${formatRequestedDate(bounds.min)} through ${formatRequestedDate(bounds.max)}. Device-local dates are used; business timezone is not configured.`}>
                <input {...inputProps("date", true)} type="date" required min={bounds.min} max={bounds.max} value={details.date} onChange={(event) => update("date", event.target.value)} />
              </Field>
              <Field name="timeWindow" label="Requested time window *" error={errors.timeWindow} hint="These are planning preferences, not bookable slots or confirmed business hours.">
                <select {...inputProps("timeWindow", true)} required value={details.timeWindow} onChange={(event) => update("timeWindow", event.target.value)}><option value="">Choose a preferred window</option>{REQUESTED_WINDOWS.map((window) => <option key={window.id} value={window.id}>{window.label}</option>)}</select>
              </Field>
            </fieldset>
            <fieldset className="space-y-5 border-t border-white/10 pt-7">
              <legend className="mb-2 pr-4 text-lg font-semibold">03 · The little details</legend>
              <Field name="note" label="Occasion or additional note (optional)" error={errors.note} hint={`Up to ${ORDER_LIMITS.note} characters. Please do not include payment information.`}><textarea {...inputProps("note", true)} rows={4} maxLength={ORDER_LIMITS.note} value={details.note} onChange={(event) => update("note", event.target.value)} /></Field>
              <Field name="allergies" label="Allergy / dietary request (optional)" error={errors.allergies} hint="Cross-contact may occur. We cannot guarantee an allergen-free cake. A request here is not an agreement to accommodate it; ingredients and suitability must be confirmed with the business."><textarea {...inputProps("allergies", true)} rows={3} maxLength={ORDER_LIMITS.allergies} value={details.allergies} onChange={(event) => update("allergies", event.target.value)} /></Field>
            </fieldset>
            <div className="border-t border-white/10 pt-7">
              <label htmlFor="order-acknowledged" className="flex cursor-pointer items-start gap-3 leading-relaxed">
                <input id="order-acknowledged" name="acknowledged" type="checkbox" required checked={details.acknowledged} aria-invalid={Boolean(errors.acknowledged)} aria-describedby={errors.acknowledged ? "order-acknowledged-error" : undefined} onChange={(event) => update("acknowledged", event.target.checked)} className="mt-1.5 h-5 w-5 shrink-0 accent-[#b76e79]" />
                <span>I understand this is a storefront preview. This draft is not placed, paid, submitted, or reserved. Prices are samples, and all requests require confirmation. *</span>
              </label>
              {errors.acknowledged && <p id="order-acknowledged-error" className="form-error mt-2">{errors.acknowledged}</p>}
            </div>
            {operationError && <p className="form-error" role="alert">{operationError}</p>}
            <div className="flex flex-wrap gap-3"><button className="button-primary" type="submit">Review draft</button><button className="button-secondary" type="button" onClick={clearDetails}>Clear form details</button></div>
          </form>
          <aside className="surface space-y-5 p-6 lg:sticky lg:top-28" aria-label="Sample estimate">
            <p className="eyebrow">A first look</p><h2 className="text-2xl font-semibold">Sample estimate</h2>
            <p className="muted">{cart.count} cake{cart.count === 1 ? "" : "s"} selected</p>
            <div className="border-y border-white/10 py-5"><p className="muted text-sm">Cake subtotal · sample USD</p><p className="mt-2 text-3xl font-semibold">{formatMoney(cart.subtotal)}</p></div>
            <p className="muted leading-relaxed">Delivery, taxes, and any customization fees are to be quoted. This is not a final total. Payment is not available in this preview.</p>
            <Link href="/cart" className="button-secondary w-full">Edit cake selections</Link>
            <Link href="/faq" className="inline-block text-sm text-[#cba0a5] underline underline-offset-4">How this preview works</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
