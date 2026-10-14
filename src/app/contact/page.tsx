import type { Metadata } from "next";
import Link from "next/link";
import InquiryForm from "@/components/contact/InquiryForm";

export const metadata: Metadata = {
  title: "Contact & custom ideas | FLOMIRA",
  description: "Gather ideas for a custom FLOMIRA cake with a local inquiry draft. Verified business contact details will be published before launch.",
};

export default function ContactPage() {
  return <div className="shop-page">
    <div className="mb-12 max-w-3xl">
      <p className="eyebrow mb-4">Every celebration has a story</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Let’s imagine yours.</h1>
      <p className="muted mt-5 text-lg leading-relaxed sm:text-xl">A favourite flavour. A meaningful detail. Something entirely your own. Gather your ideas into a custom inquiry draft, ready for a future conversation.</p>
      <p className="mt-4 text-sm text-[#cba0a5]">Storefront preview · Inquiry drafts are not sent</p>
    </div>
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <div className="space-y-6">
        <section className="surface space-y-6 p-6 sm:p-8" aria-labelledby="business-details-heading">
          <h2 id="business-details-heading" className="text-2xl font-semibold">The studio details.</h2>
          <p className="muted leading-relaxed">Verified ways to reach FLOMIRA will be published before the storefront starts accepting inquiries or orders.</p>
          <dl className="space-y-6">
            <div><dt className="eyebrow mb-2">Email & phone</dt><dd>To be confirmed before launch</dd></div>
            <div><dt className="eyebrow mb-2">Studio & pickup address</dt><dd>To be confirmed before launch</dd></div>
            <div><dt className="eyebrow mb-2">Hours, timezone & service area</dt><dd>To be confirmed before launch</dd></div>
          </dl>
        </section>
        <section className="surface p-6 sm:p-8">
          <h2 className="text-xl font-semibold">A few helpful starting points.</h2>
          <p className="muted mt-3 leading-relaxed">Tell us the occasion, the feeling you want to create, approximate servings, and a budget preference. Dates, design feasibility, dietary requests, delivery, and pricing will need business confirmation.</p>
          <Link href="/faq" className="mt-5 inline-block text-[#cba0a5] underline underline-offset-4">Read the preview FAQs</Link>
        </section>
      </div>
      <InquiryForm />
    </div>
  </div>;
}
