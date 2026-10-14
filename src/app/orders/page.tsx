import type { Metadata } from "next";
import SavedDrafts from "@/components/checkout/SavedDrafts";

export const metadata: Metadata = {
  title: "Saved drafts | FLOMIRA",
  description: "View, print, or remove your FLOMIRA cake-planning drafts saved on this browser. Drafts have not been submitted.",
  robots: { index: false, follow: true },
};

export default function OrdersPage() {
  return <div className="shop-page">
    <div className="print-exclude mb-10 max-w-3xl">
      <p className="eyebrow mb-4">Plans worth keeping</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Your saved drafts.</h1>
      <p className="muted mt-5 text-lg leading-relaxed sm:text-xl">A private starting point for your next celebration. Revisit the details, keep a printable copy, or make space for a new idea.</p>
      <p className="mt-4 text-sm text-[#cba0a5]">Local drafts only · No submitted orders or live tracking</p>
    </div>
    <SavedDrafts />
  </div>;
}
