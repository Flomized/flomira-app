import { connection } from 'next/server';
import { NextResponse } from 'next/server';
import { getBusinessSettings } from '@/lib/firestore';
import { getWhatsAppUrl } from '@/lib/whatsapp';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export async function GET() {
  await connection();

  let settings;
  try {
    settings = await getBusinessSettings();
  } catch {
    return new NextResponse('WhatsApp contact is temporarily unavailable.', {
      status: 503,
      headers: { ...noStoreHeaders, 'Retry-After': '60' },
    });
  }

  const destination = getWhatsAppUrl(settings?.whatsappNumber);
  if (!destination) {
    return new NextResponse('WhatsApp contact is not configured.', {
      status: 404,
      headers: noStoreHeaders,
    });
  }

  return NextResponse.redirect(destination, {
    status: 307,
    headers: noStoreHeaders,
  });
}
