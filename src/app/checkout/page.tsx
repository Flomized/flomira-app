import type { Metadata } from "next";
import CheckoutPlanner from "@/components/checkout/CheckoutPlanner";

export const metadata: Metadata = {
  title: "Plan your order | FLOMIRA",
  description: "Review cake selections and requested arrangements in FLOMIRA’s local order planner. Drafts are not submitted, paid, or reserved.",
};

export default function CheckoutPage() {
  return <div className="shop-page">
    <div className="print-exclude mb-10 max-w-3xl">
      <p className="eyebrow mb-4">A celebration in the making</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Plan your order.</h1>
      <p className="muted mt-5 text-lg leading-relaxed sm:text-xl">A thoughtful first draft for something wonderful. Review your wishes, explore a sample estimate, and save your plan on this device.</p>
      <p className="mt-4 text-sm text-[#cba0a5]">Storefront preview · No orders, payments, or reservations are taken here.</p>
    </div>
    <CheckoutPlanner />
  </div>;
}
