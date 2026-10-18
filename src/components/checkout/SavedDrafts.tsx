"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { formatMoney } from "@/data/catalog";
import { deserializeOrderDrafts, DRAFT_STATUS, formatRequestedDate, MAX_DRAFTS } from "@/lib/orders";
import OrderSummary from "./OrderSummary";
import {
  clearDraftsLocally, getDraftServerSnapshot, getDraftStorageSnapshot, removeDraftLocally,
  STORAGE_LOADING, STORAGE_UNAVAILABLE, subscribeToDrafts,
} from "./draft-storage";

export default function SavedDrafts() {
  const raw = useSyncExternalStore(subscribeToDrafts, getDraftStorageSnapshot, getDraftServerSnapshot);
  const parsed = useMemo(() => deserializeOrderDrafts(raw || null), [raw]);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const selected = parsed.drafts.find((draft) => draft.reference === selectedReference);

  useEffect(() => { if (selectedReference) summaryHeading.current?.focus(); }, [selectedReference]);

  function remove(reference: string) {
    if (!window.confirm("Permanently remove this draft and its personal details from this browser? Printed or downloaded copies will remain wherever you saved them.")) return;
    setError("");
    setNotice("");
    try {
      removeDraftLocally(reference);
      if (selectedReference === reference) setSelectedReference(null);
      setNotice("Draft removed from this browser.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The draft could not be removed."); }
  }

  function clearAll() {
    if (!window.confirm("Permanently clear ALL saved drafts and their personal details from this browser? Printed or downloaded copies are not removed.")) return;
    setError("");
    setNotice("");
    try {
      clearDraftsLocally();
      setSelectedReference(null);
      setNotice("All saved drafts and their personal details have been cleared from this browser.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The saved details could not be cleared."); }
  }

  function printSelected() {
    setError("");
    try { window.print(); }
    catch { setError("The print dialog could not open. Use your browser’s Print command to print the selected summary."); }
  }

  if (raw === STORAGE_LOADING) return (
    <div className="surface p-8 text-center sm:p-12" role="status" aria-busy="true">
      <p className="eyebrow mb-3">One moment</p>
      <p className="muted">Reading drafts on this browser…</p>
    </div>
  );
  if (raw === STORAGE_UNAVAILABLE) return <div className="surface space-y-4 p-8" role="alert">
    <h2 className="text-2xl font-semibold">Saved drafts could not be read.</h2>
    <p className="muted leading-relaxed">Local storage is blocked or unavailable in this browser. Check browser permissions and refresh this page. We cannot confirm whether any drafts are saved.</p>
    <Link className="button-secondary" href="/checkout">Return to the planner</Link>
  </div>;

  return <div className="space-y-8">
    <div className="print-exclude surface space-y-4 p-6">
      <p className="leading-relaxed">These drafts live only in this browser profile. They are not sent to FLOMIRA, synced across devices, or connected to an order-tracking system. Clearing browser data removes them.</p>
      <p className="muted text-sm leading-relaxed">Shared device? Anyone with access to this browser profile may see saved names, contact details, addresses, and requests. Remove drafts when you finish. Your cart is managed separately.</p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#cba0a5]">{parsed.drafts.length} of {MAX_DRAFTS} local drafts</p>
        {(parsed.drafts.length > 0 || parsed.invalid) && <button type="button" className="button-secondary" onClick={clearAll}>Clear all saved personal details</button>}
      </div>
    </div>
    {error && <p className="form-error print-exclude surface p-5" role="alert">{error}</p>}
    {notice && <p className="print-exclude surface p-5" role="status">{notice}</p>}
    {parsed.invalid && <div className="print-exclude surface space-y-3 border border-[#b76e79]/40 p-6" role="alert">
      <h2 className="font-semibold">Some stored data could not be read safely.</h2>
      <p className="muted leading-relaxed">Only readable drafts are shown below. Saving and individual removal are paused to avoid overwriting unreadable data. You can review and print readable drafts, then choose “Clear all saved personal details” to reset this browser’s draft storage.</p>
    </div>}

    {!parsed.drafts.length && !parsed.invalid ? <div className="surface mx-auto max-w-2xl p-8 text-center sm:p-12">
      <p className="eyebrow mb-4">Room for a new celebration</p><h2 className="text-3xl font-semibold">No saved drafts yet.</h2>
      <p className="muted mt-4 text-lg leading-relaxed">Choose your cakes, review the details, and give permission to save a local draft. A saved draft will appear here on this browser.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3"><Link className="button-primary" href="/products">Explore cakes</Link><Link className="button-secondary" href="/checkout">Open the planner</Link></div>
    </div> : <div className="print-exclude grid gap-5 md:grid-cols-2">
      {parsed.drafts.map((draft) => <article className="surface flex flex-col p-6" key={draft.reference}>
        <p className="eyebrow mb-3">{DRAFT_STATUS}</p>
        <h2 className="text-xl font-semibold">{draft.items[0].productName}{draft.items.length > 1 ? ` + ${draft.items.length - 1} more selection${draft.items.length > 2 ? "s" : ""}` : ""}</h2>
        <p className="muted mt-3">For {draft.details.name}</p>
        <p className="muted mt-1">Requested: {formatRequestedDate(draft.details.date)}</p>
        <p className="mt-4 font-medium">Sample cake subtotal: {formatMoney(draft.sampleSubtotalCents)}</p>
        <p className="muted mt-3 break-all font-mono text-xs">{draft.reference}</p>
        <p className="muted mt-2 text-sm">Saved {new Date(draft.createdAt).toLocaleString("en-US")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="button-primary" aria-label={`View draft for ${draft.items[0].productName}, requested ${formatRequestedDate(draft.details.date)}`} aria-expanded={selectedReference === draft.reference} aria-controls="selected-draft" onClick={() => { setSelectedReference(draft.reference); setError(""); }}>View summary</button>
          <button type="button" className="button-secondary" disabled={parsed.invalid} onClick={() => remove(draft.reference)} aria-label={`Remove draft for ${draft.items[0].productName}, requested ${formatRequestedDate(draft.details.date)}`}>Remove draft</button>
        </div>
      </article>)}
    </div>}

    <div id="selected-draft">{selected && <div className="space-y-5">
      <div className="print-exclude flex flex-wrap items-center justify-between gap-4">
        <h2 ref={summaryHeading} tabIndex={-1} className="text-2xl font-semibold outline-none">Selected draft</h2>
        <div className="flex flex-wrap gap-3"><button type="button" className="button-primary" onClick={printSelected}>Print / save as PDF</button><button type="button" className="button-secondary" onClick={() => setSelectedReference(null)}>Close summary</button></div>
      </div>
      <p className="muted print-exclude text-sm">Use your print dialog to print or save as PDF. This copy contains personal details; keep it private.</p>
      <OrderSummary order={selected} />
    </div>}</div>
  </div>;
}
