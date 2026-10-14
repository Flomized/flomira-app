import { formatMoney } from "@/data/catalog";
import {
  DRAFT_STATUS, formatRequestedDate, REQUESTED_WINDOWS,
  type DraftItem, type OrderDetails,
} from "@/lib/orders";

export type OrderSummaryData = {
  details: OrderDetails;
  items: DraftItem[];
  sampleSubtotalCents: number;
  reference?: string;
  createdAt?: string;
};

export default function OrderSummary({ order }: { order: OrderSummaryData }) {
  const { details, items } = order;
  const allergens = Array.from(new Set(items.flatMap((item) => item.allergens)));
  return (
    <section className="flomira-print-summary surface space-y-8 p-6 sm:p-8 print:bg-white print:text-black" aria-label="Local draft summary">
      <style>{`
        @media print {
          body:has(.flomira-print-summary) { background: white !important; color: #111 !important; }
          body:has(.flomira-print-summary) header,
          body:has(.flomira-print-summary) footer,
          body:has(.flomira-print-summary) nav,
          body:has(.flomira-print-summary) .print-exclude { display: none !important; }
          .flomira-print-summary, .flomira-print-summary * { color: #111 !important; background: transparent !important; box-shadow: none !important; }
          .flomira-print-summary { border: 0 !important; padding: 0 !important; font-size: 11pt; }
          .flomira-print-summary li, .flomira-print-summary dl { break-inside: avoid; }
          .flomira-print-summary h2, .flomira-print-summary h3 { break-after: avoid; }
        }
      `}</style>
      <div>
        <p className="eyebrow mb-3">FLOMIRA · Local order planner</p>
        <h2 className="text-2xl font-semibold tracking-tight">{order.reference ? "Your saved draft" : "Your draft review"}</h2>
        <p className="mt-2 font-medium text-[#cba0a5]">{DRAFT_STATUS}</p>
        {order.reference && <p className="mt-3 break-all text-sm">Reference: <span className="font-mono">{order.reference}</span></p>}
        {order.createdAt && <p className="muted mt-1 text-sm">Saved on this device: {new Date(order.createdAt).toLocaleString("en-US")}</p>}
        <p className="muted mt-4 leading-relaxed">This is a planning document only. Nothing has been sent, placed, paid, or reserved. Requested dates and time windows are not confirmed availability.</p>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Cake selections</h3>
        <ul className="divide-y divide-white/10">
          {items.map((item) => (
            <li key={item.id} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.productName} <span className="muted">× {item.quantity}</span></p>
                  <p className="muted mt-1">{item.sizeLabel} · {item.servings} · {item.flavor}</p>
                  <p className="muted mt-1 text-sm">Sample unit price {formatMoney(item.unitPriceCents)} USD</p>
                </div>
                <p className="shrink-0 font-medium">{formatMoney(item.unitPriceCents * item.quantity)}</p>
              </div>
              {item.message && <p className="mt-3 whitespace-pre-wrap break-words text-sm">Cake message request: {item.message}</p>}
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-3 border-t border-white/15 pt-5">
          <div className="flex flex-wrap justify-between gap-3 text-lg font-semibold"><dt>Sample cake subtotal</dt><dd>{formatMoney(order.sampleSubtotalCents)} USD</dd></div>
          <div className="flex flex-wrap justify-between gap-3 text-sm"><dt className="muted">Delivery / pickup arrangements</dt><dd>To be quoted & confirmed</dd></div>
          <div className="flex flex-wrap justify-between gap-3 text-sm"><dt className="muted">Taxes & any additional fees</dt><dd>To be confirmed</dd></div>
        </dl>
        <p className="muted mt-4 text-sm leading-relaxed">Illustrative USD pricing, not a final quote or an all-in total. Delivery fees, taxes, customization, service area, and payment are not configured.</p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-3 text-lg font-semibold">Customer details</h3>
          <dl className="space-y-3 break-words">
            <div><dt className="muted text-sm">Name</dt><dd>{details.name}</dd></div>
            <div><dt className="muted text-sm">Email</dt><dd>{details.email}</dd></div>
            <div><dt className="muted text-sm">Phone</dt><dd>{details.phone}</dd></div>
          </dl>
        </div>
        <div className="min-w-0">
          <h3 className="mb-3 text-lg font-semibold">Requested arrangements</h3>
          <dl className="space-y-3">
            <div><dt className="muted text-sm">Preference</dt><dd>{details.fulfillment === "delivery" ? "Delivery requested" : "Pickup requested"}</dd></div>
            <div><dt className="muted text-sm">Desired date</dt><dd>{formatRequestedDate(details.date)}</dd></div>
            <div><dt className="muted text-sm">Requested window</dt><dd>{REQUESTED_WINDOWS.find((window) => window.id === details.timeWindow)?.label}</dd></div>
            {details.fulfillment === "delivery" && <div><dt className="muted text-sm">Requested delivery address</dt><dd className="whitespace-pre-wrap break-words">{details.address}</dd></div>}
          </dl>
          <p className="muted mt-4 text-sm">Device-local dates and times are used for this preview. Business timezone and pickup address: to be confirmed before launch.</p>
        </div>
      </div>

      <div className="space-y-5 border-t border-white/15 pt-6">
        <div><h3 className="font-semibold">Additional requests</h3><p className="muted mt-2 whitespace-pre-wrap break-words">{details.note || "No additional notes."}</p></div>
        <div><h3 className="font-semibold">Allergy / dietary request</h3><p className="muted mt-2 whitespace-pre-wrap break-words">{details.allergies || "No allergy or dietary request provided."}</p></div>
        <p className="text-sm leading-relaxed">Sample listed allergens: {allergens.length ? allergens.join(", ") : "not specified"}. Ingredient information must be confirmed with the business. Cross-contact may occur; FLOMIRA cannot guarantee an allergen-free cake. A note here does not confirm that a dietary request can be accommodated.</p>
        <p className="muted text-sm">Preview acknowledgment: accepted. This document is not a receipt, an order confirmation, or a reservation.</p>
      </div>
    </section>
  );
}
