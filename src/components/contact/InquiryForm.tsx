"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { addCalendarDays, cleanOrderText, formatRequestedDate, isCalendarDate, localCalendarDate, MAX_HORIZON_DAYS } from "@/lib/orders";
import { useLocalToday } from "@/components/checkout/use-local-today";

type Inquiry = {
  name: string; email: string; occasion: string; date: string;
  servings: string; budget: string; message: string;
};
type InquiryErrors = Partial<Record<keyof Inquiry, string>>;
const EMPTY: Inquiry = { name: "", email: "", occasion: "", date: "", servings: "", budget: "", message: "" };
const LIMITS: Record<keyof Inquiry, number> = { name: 80, email: 254, occasion: 100, date: 10, servings: 4, budget: 9, message: 2000 };
const LABELS: Record<keyof Inquiry, string> = {
  name: "Full name", email: "Email", occasion: "Occasion", date: "Desired date",
  servings: "Approximate servings", budget: "Budget preference (USD)", message: "Your ideas & requests",
};

function validateInquiry(input: Inquiry, today: string): { details: Inquiry; errors: InquiryErrors } {
  const details = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, cleanOrderText(value, LIMITS[key as keyof Inquiry], key === "message")])) as Inquiry;
  const errors: InquiryErrors = {};
  if (!details.name) errors.name = "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) errors.email = "Enter a valid email address, such as name@example.com.";
  if (!details.occasion) errors.occasion = "Tell us the occasion, or enter ‘just because’.";
  if (details.message.length < 10) errors.message = "Add at least 10 characters about your ideas or request.";
  if (details.date && (!isCalendarDate(details.date) || details.date < today || details.date > addCalendarDays(today, MAX_HORIZON_DAYS))) errors.date = `Choose a date from today through ${formatRequestedDate(addCalendarDays(today, MAX_HORIZON_DAYS))}, or leave it open.`;
  if (details.servings && (!/^\d+$/.test(details.servings) || Number(details.servings) < 1 || Number(details.servings) > 1000)) errors.servings = "Enter a whole number from 1 to 1,000, or leave this blank.";
  if (details.budget && (!/^\d{1,6}(\.\d{1,2})?$/.test(details.budget) || Number(details.budget) <= 0 || Number(details.budget) > 100000)) errors.budget = "Enter a USD amount from 0.01 to 100,000 with at most two decimal places, or leave this blank.";
  for (const key of Object.keys(LIMITS) as (keyof Inquiry)[]) {
    if (input[key].length > LIMITS[key]) errors[key] = `Use ${LIMITS[key]} characters or fewer.`;
  }
  return { details, errors };
}

function inquiryText(details: Inquiry): string {
  return [
    "FLOMIRA — INQUIRY DRAFT · NOT SENT",
    "Prepared locally. No message, order, payment, or reservation has been submitted.",
    "",
    `Name: ${details.name}`,
    `Email: ${details.email}`,
    `Occasion: ${details.occasion}`,
    `Desired date: ${details.date ? formatRequestedDate(details.date) : "Open / to be discussed"}`,
    `Approximate servings: ${details.servings || "To be discussed"}`,
    `Budget preference: ${details.budget ? `$${Number(details.budget).toFixed(2)} USD (a preference, not a quote)` : "To be discussed"}`,
    "",
    "Ideas & requests:", details.message,
    "",
    "Dates are device-local planning preferences, not confirmed availability.",
    "Contact details, service area, pricing, and payment arrangements are to be confirmed before launch.",
    "Dietary requests need business confirmation. An allergen-free cake cannot be guaranteed.",
  ].join("\n");
}

export default function InquiryForm() {
  const today = useLocalToday();
  const [details, setDetails] = useState<Inquiry>({ ...EMPTY });
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [preview, setPreview] = useState("");
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const [copying, setCopying] = useState(false);
  const errorSummary = useRef<HTMLDivElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const previewText = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (Object.keys(errors).length) errorSummary.current?.focus(); }, [errors]);
  useEffect(() => { if (preview) previewHeading.current?.focus(); }, [preview]);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = validateInquiry(details, localCalendarDate(new Date()));
    setErrors(checked.errors);
    setActionError("");
    setFeedback("");
    if (Object.keys(checked.errors).length) return;
    setDetails(checked.details);
    setPreview(inquiryText(checked.details));
  }

  async function copyText() {
    if (copying) return;
    setActionError("");
    setFeedback("");
    if (!navigator.clipboard?.writeText) {
      setActionError("Clipboard access is unavailable. Select the draft text below and copy it with your keyboard or device’s copy command.");
      return;
    }
    setCopying(true);
    try {
      await navigator.clipboard.writeText(preview);
      setFeedback("Inquiry text copied to your clipboard. It has not been sent. Your clipboard now contains the personal details shown below.");
    } catch {
      setActionError("Copying was blocked or failed. Nothing was sent. Select the text below and copy it manually.");
    } finally { setCopying(false); }
  }

  function downloadText() {
    setActionError("");
    setFeedback("");
    let url: string | undefined;
    const link = document.createElement("a");
    try {
      url = URL.createObjectURL(new Blob([preview], { type: "text/plain;charset=utf-8" }));
      link.href = url;
      link.download = "flomira-inquiry-draft-not-sent.txt";
      document.body.appendChild(link);
      link.click();
      setFeedback("A text-file download was requested. Check your browser’s downloads to confirm it was saved. Nothing was sent to FLOMIRA.");
    } catch {
      setActionError("The download could not be started. You can select and copy the text below instead. Nothing was sent.");
    } finally {
      link.remove();
      if (url) window.setTimeout(() => URL.revokeObjectURL(url!), 30_000);
    }
  }

  function clear() {
    if (!window.confirm("Clear this inquiry and all personal details from the page? Any clipboard or downloaded copy is separate and will not be erased.")) return;
    setDetails({ ...EMPTY });
    setErrors({});
    setPreview("");
    setActionError("");
    setFeedback("Inquiry details cleared from this page. Nothing was sent.");
  }

  function edit() {
    setPreview("");
    setFeedback("");
    setActionError("");
    window.setTimeout(() => document.getElementById("inquiry-name")?.focus(), 0);
  }

  return <section className="surface p-6 sm:p-8" aria-label="Prepare an inquiry draft">
    {preview ? <div className="space-y-6">
      <div>
        <p className="eyebrow mb-3">Ready for your review · Not sent</p>
        <h2 ref={previewHeading} tabIndex={-1} className="text-3xl font-semibold outline-none">Your ideas, gathered.</h2>
        <p className="muted mt-4 leading-relaxed">Review your inquiry, then copy it or request a text-file download for your own records. No message is sent to FLOMIRA, and no availability is confirmed.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="button-primary" disabled={copying} onClick={copyText}>{copying ? "Copying…" : "Copy inquiry text"}</button>
        <button type="button" className="button-secondary" onClick={downloadText}>Download text draft</button>
        <button type="button" className="button-secondary" disabled={copying} onClick={edit}>Edit details</button>
      </div>
      <p className="muted text-sm leading-relaxed">Your copied or downloaded draft includes your personal details. Keep it private. This form does not save details in browser local storage; leaving or refreshing this page clears the in-memory draft.</p>
      {feedback && <p className="rounded-xl border border-[#b76e79]/40 p-4" role="status">{feedback}</p>}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      <div>
        <label className="field-label" htmlFor="inquiry-preview">Inquiry draft text — not sent</label>
        <textarea id="inquiry-preview" ref={previewText} className="field w-full font-mono text-sm leading-relaxed" rows={20} readOnly value={preview} />
        <button type="button" className="mt-3 min-h-11 text-sm text-[#cba0a5] underline underline-offset-4" onClick={() => { previewText.current?.focus(); previewText.current?.select(); }}>Select all draft text for manual copying</button>
      </div>
      <button type="button" className="button-secondary" disabled={copying} onClick={clear}>Clear inquiry & personal details</button>
    </div> : <form className="space-y-6" onSubmit={prepare} noValidate>
      <div><h2 className="text-2xl font-semibold">Begin with an idea.</h2><p className="muted mt-3 leading-relaxed">Prepare an inquiry draft here. This preview does not send messages. Fields marked * are required; the rest can stay open.</p></div>
      {feedback && <p className="rounded-xl border border-[#b76e79]/40 p-4" role="status">{feedback}</p>}
      {Object.keys(errors).length > 0 && <div role="alert" ref={errorSummary} tabIndex={-1} className="rounded-xl border border-[#cba0a5]/50 p-5 outline-none"><h3 className="font-semibold">Please check these details.</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{Object.entries(errors).map(([key, message]) => <li key={key}><a className="underline underline-offset-4" href={`#inquiry-${key}`}>{message}</a></li>)}</ul></div>}
      <div className="grid gap-5 sm:grid-cols-2">
        {(Object.keys(LABELS) as (keyof Inquiry)[]).map((key) => {
          const required = key === "name" || key === "email" || key === "occasion" || key === "message";
          const hint = key === "date" ? "Optional, within 180 days. Device-local dates; a preference, not a reservation."
            : key === "servings" ? "Optional, from 1 to 1,000. Final cake sizing is to be discussed."
            : key === "budget" ? "Optional sample USD budget, not a quote. No payment is taken."
            : key === "message" ? "Up to 2,000 characters. Include style or dietary requests; please do not include payment details. An allergen-free cake cannot be guaranteed."
            : "";
          const props = {
            id: `inquiry-${key}`, name: key, className: "field w-full", value: details[key], required,
            maxLength: LIMITS[key], "aria-invalid": Boolean(errors[key]),
            "aria-describedby": [hint ? `inquiry-${key}-hint` : "", errors[key] ? `inquiry-${key}-error` : ""].filter(Boolean).join(" ") || undefined,
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDetails((current) => ({ ...current, [key]: event.target.value })),
          };
          return <div key={key} className={key === "message" || key === "occasion" ? "sm:col-span-2" : ""}>
            <label className="field-label" htmlFor={props.id}>{LABELS[key]}{required ? " *" : " (optional)"}</label>
            {hint && <p className="muted mb-2 text-sm leading-relaxed" id={`inquiry-${key}-hint`}>{hint}</p>}
            {key === "message" ? <textarea {...props} rows={5} /> : <input {...props} type={key === "email" ? "email" : key === "date" ? "date" : "text"} autoComplete={key === "name" ? "name" : key === "email" ? "email" : "off"} inputMode={key === "servings" ? "numeric" : key === "budget" ? "decimal" : undefined} min={key === "date" ? today || undefined : undefined} max={key === "date" && today ? addCalendarDays(today, MAX_HORIZON_DAYS) : undefined} />}
            {errors[key] && <p className="form-error mt-2" id={`inquiry-${key}-error`}>{errors[key]}</p>}
          </div>;
        })}
      </div>
      <p className="muted border-t border-white/10 pt-5 text-sm leading-relaxed">Your information is kept in memory while this page is open. It is not saved to browser local storage. You decide whether to copy or download the prepared text.</p>
      <div className="flex flex-wrap gap-3"><button className="button-primary" type="submit" disabled={!today}>Review inquiry draft</button><button className="button-secondary" type="button" onClick={clear}>Clear details</button></div>
    </form>}
  </section>;
}
