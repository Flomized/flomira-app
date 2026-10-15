import type { Metadata } from "next";
import Link from "next/link";
import CheckoutPlanner from "@/components/checkout/CheckoutPlanner";
import PublicPageFrame from "@/components/PublicPageFrame";

export const metadata: Metadata = {
  title: "Plan your order | FLOMIRA",
  description: "Review cake selections and requested arrangements in FLOMIRA’s local order planner. Drafts are not submitted, paid, or reserved.",
};

export default function CheckoutPage() {
  return <PublicPageFrame>
    <div className="shop-page">
      <header className="print-exclude mb-10 max-w-3xl">
        <p className="eyebrow mb-4">A celebration in the making</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Plan your order.</h1>
        <p className="muted mt-5 text-lg leading-relaxed sm:text-xl">A thoughtful first draft for something wonderful. Review your wishes, explore a sample estimate, and save your plan on this device.</p>
        <p className="mt-4 text-sm text-[#cba0a5]">Storefront preview · No orders, payments, or reservations are taken here.</p>
        <nav className="mt-6 flex flex-wrap gap-3" aria-label="Planner shortcuts">
          <Link href="/cart" className="button-secondary">Review cart</Link>
          <Link href="/orders" className="button-secondary">Saved drafts</Link>
          <Link href="/faq" className="inline-flex min-h-11 items-center px-1 text-sm text-[#cba0a5] underline underline-offset-4 hover:text-white">How this preview works</Link>
        </nav>
      </header>
      <CheckoutPlanner />
    </div>
  </PublicPageFrame>;
}
