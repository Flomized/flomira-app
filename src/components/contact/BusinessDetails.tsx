'use client';

import { useBusinessSettings } from '@/components/BusinessSettingsProvider';
import { getWhatsAppUrl } from '@/lib/whatsapp';
import type { BusinessSettings } from '@/types/website';

function MissingDetail({ children = 'Not published yet' }: { children?: string }) {
  return <span className="muted">{children}</span>;
}

function SettingsUnavailable({ message }: { message: string }) {
  return (
    <section className="surface space-y-4 p-6 sm:p-8" aria-labelledby="business-details-heading" role="alert">
      <h2 id="business-details-heading" className="text-2xl font-semibold">The studio details.</h2>
      <p className="muted leading-relaxed">{message}</p>
    </section>
  );
}

function formatHours(settings: BusinessSettings) {
  return settings.hours.map((hours) => (
    <li key={hours.day} className="flex justify-between gap-4 border-b border-white/10 pb-2 last:border-0 last:pb-0">
      <span>{hours.day}</span>
      <span className="muted text-right">{hours.isClosed ? 'Closed' : `${hours.open} – ${hours.close}`}</span>
    </li>
  ));
}

export default function BusinessDetails() {
  const { settings, loading, error } = useBusinessSettings();

  if (loading) return <SettingsUnavailable message="Loading the latest studio details…" />;
  if (error) return <SettingsUnavailable message="The current studio details could not be loaded. Please refresh or use the inquiry draft while we reconnect." />;

  if (!settings) {
    return <SettingsUnavailable message="Studio details have not been published yet. Please use the inquiry draft for now." />;
  }

  const email = settings.email.trim();
  const phone = settings.phoneNumber.trim();
  const whatsappUrl = getWhatsAppUrl(settings.whatsappNumber);
  const businessName = settings.businessName.trim() || 'The studio';
  const socialLinks = Object.entries(settings.socialMedia).filter(([, value]) => typeof value === 'string' && value.trim());

  return (
    <section className="surface space-y-6 p-6 sm:p-8" aria-labelledby="business-details-heading">
      <div>
        <h2 id="business-details-heading" className="text-2xl font-semibold">{businessName} details.</h2>
        <p className="muted mt-4 leading-relaxed">
          {settings.description || 'Reach FLOMIRA directly using the verified details below.'}
        </p>
      </div>

      <dl className="space-y-6">
        <div>
          <dt className="eyebrow mb-2">Email &amp; phone</dt>
          <dd className="space-y-2">
            {email ? <a className="block break-all hover:text-[var(--flomira-blush)]" href={`mailto:${email}`}>{email}</a> : <MissingDetail />}
            {phone && <a className="block hover:text-[var(--flomira-blush)]" href={`tel:${phone}`}>{phone}</a>}
            {whatsappUrl && <a className="block text-[var(--flomira-copper)] hover:text-[var(--flomira-blush)]" href={whatsappUrl} target="_blank" rel="noreferrer">Message us on WhatsApp ↗</a>}
          </dd>
        </div>

        <div>
          <dt className="eyebrow mb-2">Studio &amp; pickup address</dt>
          <dd>{settings.address.trim() || <MissingDetail />}</dd>
        </div>

        <div>
          <dt className="eyebrow mb-2">Hours &amp; service area</dt>
          <dd className="space-y-4">
            {settings.hours.length ? <ul className="space-y-2 text-sm">{formatHours(settings)}</ul> : <MissingDetail>Hours not published yet</MissingDetail>}
            {settings.deliveryAreas.length ? (
              <div>
                <p className="mb-2 text-sm font-semibold">Delivery and pickup areas</p>
                <ul className="space-y-1 text-sm text-[var(--flomira-muted)]">
                  {settings.deliveryAreas.map((area) => <li key={area.name}>{area.name}</li>)}
                </ul>
              </div>
            ) : <MissingDetail>Service areas not published yet</MissingDetail>}
          </dd>
        </div>
      </dl>

      {socialLinks.length > 0 && (
        <div className="border-t border-white/10 pt-5">
          <p className="eyebrow mb-3">Follow the studio</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {socialLinks.map(([name, value]) => <a key={name} href={value as string} target="_blank" rel="noreferrer" className="text-[var(--flomira-copper)] capitalize underline underline-offset-4 hover:text-[var(--flomira-blush)]">{name} ↗</a>)}
          </div>
        </div>
      )}

      <p className="border-t border-white/10 pt-5 text-sm text-[var(--flomira-muted)]">
        {settings.acceptsOrders ? 'Order requests are currently being accepted for confirmation.' : 'Order requests are currently paused; inquiries are still welcome.'}
      </p>
    </section>
  );
}
