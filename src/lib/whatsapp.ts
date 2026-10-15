const WHATSAPP_NUMBER_PATTERN = /^[1-9]\d{6,14}$/;

/**
 * Convert a stored international WhatsApp number into the digits-only form
 * required by wa.me. Local numbers without a country code are rejected so a
 * printed QR code cannot silently point at the wrong destination.
 */
export function normalizeWhatsAppNumber(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const input = value.trim();
  if (!input) return null;

  let candidate = input;
  if (candidate.startsWith('+')) {
    candidate = candidate.slice(1);
  } else if (candidate.startsWith('00')) {
    candidate = candidate.slice(2);
  }

  if (!candidate || !/^[\d\s().-]+$/.test(candidate)) return null;

  const digits = candidate.replace(/\D/g, '');
  return WHATSAPP_NUMBER_PATTERN.test(digits) ? digits : null;
}

export function getWhatsAppUrl(value: unknown, message?: string): string | null {
  const number = normalizeWhatsAppNumber(value);
  if (!number) return null;

  const baseUrl = `https://wa.me/${number}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
}
