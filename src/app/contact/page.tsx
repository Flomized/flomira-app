import type { Metadata } from "next";
import Link from "next/link";
import BusinessDetails from "@/components/contact/BusinessDetails";
import InquiryForm from "@/components/contact/InquiryForm";
import PublicPageFrame from "@/components/PublicPageFrame";

export const metadata: Metadata = {
  title: "Contact & custom ideas | FLOMIRA",
  description: "Find FLOMIRA’s current studio details and gather ideas for a custom cake with a local inquiry draft.",
};

export default function ContactPage() {
  return <PublicPageFrame>
    <div className="shop-page">
      <header className="mb-12 max-w-3xl">
        <p className="eyebrow mb-4">Every celebration has a story</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Let’s imagine yours.</h1>
        <p className="muted mt-5 text-lg leading-relaxed sm:text-xl">A favourite flavour. A meaningful detail. Something entirely your own. Gather your ideas into a custom inquiry draft, ready for a future conversation.</p>
        <p className="mt-4 text-sm text-[#cba0a5]">Storefront preview · Inquiry drafts are not sent</p>
        <nav className="mt-6 flex flex-wrap gap-3" aria-label="Custom cake shortcuts">
          <Link href="/products" className="button-secondary">Browse the collection</Link>
          <Link href="/faq" className="inline-flex min-h-11 items-center px-1 text-sm text-[#cba0a5] underline underline-offset-4 hover:text-white">Read the FAQs</Link>
        </nav>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="space-y-6">
          <BusinessDetails />
          <section className="surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold">A few helpful starting points.</h2>
            <p className="muted mt-3 leading-relaxed">Tell us the occasion, the feeling you want to create, approximate servings, and a budget preference. Dates, design feasibility, dietary requests, delivery, and pricing will need business confirmation.</p>
            <Link href="/faq" className="mt-5 inline-block text-[#cba0a5] underline underline-offset-4">Read the preview FAQs</Link>
          </section>
        </div>
        <InquiryForm />
      </div>
    </div>
  </PublicPageFrame>;
}
