import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Frequently asked questions | FLOMIRA",
  description: "Learn how FLOMIRA’s storefront preview, local drafts, sample prices, dietary requests, and cake care guidance work.",
};

const questions = [
  {
    question: "Can I place an order or pay here?",
    answer: "Not yet. This is a storefront preview for exploring cakes and preparing a plan. Checkout creates a local draft only after you review the details and consent to device storage. No order is sent, no payment is taken, and no date or cake is reserved. Ordering and payment arrangements will be confirmed before launch.",
  },
  {
    question: "Are the prices a final quote?",
    answer: "All displayed prices are illustrative sample prices in USD. The planner shows a sample cake subtotal, not an all-in total. Delivery, taxes, design changes, and any other fees need a final business quote. Unconfigured fees are not promises of free delivery or zero tax.",
  },
  {
    question: "How far ahead should I plan?",
    answer: "Each cake has a sample planning lead time. Checkout uses the longest lead time among your cart selections and allows requested dates up to 180 days from today. This helps make a realistic draft; it is not a commitment to make a cake on that date. Complex designs may need different arrangements once ordering opens.",
  },
  {
    question: "Does selecting a date or time reserve a slot?",
    answer: "No. Every date and time window is a requested preference only. This preview uses your device’s local calendar and time; the business timezone, opening hours, capacity, and availability have not been configured. None of the windows are bookable appointments.",
  },
  {
    question: "Where are my saved drafts, and who can see them?",
    answer: "Your saved drafts appear under Saved drafts on this browser profile only. With your explicit consent, the browser stores your name, contact details, requested address if applicable, notes, and selections locally. They are not sent to FLOMIRA or synced to another device. Anyone using the same browser profile may be able to read them, so avoid saving on a shared device. You can keep up to 10 drafts, print a copy, remove one, or clear all saved personal details. Clearing browser data also removes drafts.",
  },
  {
    question: "Can I ask about a custom cake?",
    answer: "You can prepare a custom inquiry draft on the Contact page with your occasion, design ideas, desired date, approximate servings, and budget preference. Review it, then copy or download the text for your own records. The form does not send a message or save your information to local storage. Verified contact details and a real inquiry route will be confirmed before launch.",
  },
  {
    question: "Can you accommodate allergies or special diets?",
    answer: "Sample allergen information is provided with the cakes, but the exact recipe and ingredients must be confirmed with the business. Cross-contact may occur, and FLOMIRA cannot guarantee an allergen-free cake. Include dietary requirements in your draft as a request; recording a request is not confirmation that it can be accommodated. Anyone with a food allergy should obtain verified ingredient and preparation information before deciding whether a cake is suitable.",
  },
  {
    question: "Is delivery available, and where can I collect?",
    answer: "Delivery and pickup are planning preferences in this preview. The service area, delivery fees, collection address, and available hours are to be confirmed before launch. Entering an address does not mean that delivery is available there. No fictional contact information or collection address should be used to arrange a visit.",
  },
  {
    question: "How should I transport and care for a cake?",
    answer: "As general guidance, carry a boxed cake level, support it from the base, and keep it away from direct sunlight and heat. For travel, use a stable, flat surface and avoid abrupt stops. Storage, refrigeration, serving temperature, and how long a cake can safely be kept depend on its ingredients and decoration. Follow the baker’s cake-specific instructions once those are available; this preview does not provide a universal shelf-life or food-safety guarantee.",
  },
  {
    question: "Can I change, cancel, or track a draft?",
    answer: "A draft is not a submitted order, so there is nothing to cancel or track with a business. You can remove saved drafts at any time and prepare a fresh one using your cart. Printed, copied, or downloaded versions are separate copies you manage yourself. Real order-change, cancellation, refund, and payment policies will need to be published before launch.",
  },
];

export default function FaqPage() {
  return <div className="shop-page">
    <div className="mb-12 max-w-3xl">
      <p className="eyebrow mb-4">A little clarity, before the celebration</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Good to know.</h1>
      <p className="muted mt-5 text-lg leading-relaxed sm:text-xl">Thoughtful plans start with clear expectations. Here’s how this storefront preview works, and what still needs a real conversation.</p>
    </div>
    <div className="max-w-4xl space-y-4">
      {questions.map(({ question, answer }, index) => <details className="surface group p-6 sm:p-7" key={question} open={index === 0}>
        <summary className="cursor-pointer text-lg font-semibold leading-relaxed marker:text-[#cba0a5] sm:text-xl">{question}</summary>
        <p className="muted mt-5 text-base leading-8">{answer}</p>
      </details>)}
    </div>
    <div className="surface mt-10 flex max-w-4xl flex-wrap items-center justify-between gap-6 p-6 sm:p-8">
      <div><h2 className="text-2xl font-semibold">Have something special in mind?</h2><p className="muted mt-2">Gather the details into a local inquiry draft.</p></div>
      <Link href="/contact" className="button-primary">Prepare an inquiry</Link>
    </div>
  </div>;
}
