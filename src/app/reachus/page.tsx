import type { Metadata } from 'next';
import ReachUsView from '@/components/reachus/ReachUsView';

export const metadata: Metadata = {
  title: 'Reach Us | FLOMIRA Atelier',
  description: 'Connect directly with FLOMIRA on WhatsApp, Facebook, Instagram, YouTube, and Gmail. Direct channels for artisan cake inquiries and sweet celebrations.',
  openGraph: {
    title: 'Connect with FLOMIRA | Official Reach Hub',
    description: 'Instant direct links to WhatsApp, Facebook, Instagram, YouTube, Gmail & Cake Menu.',
    type: 'website',
  },
};

export default function ReachUsPage() {
  return <ReachUsView />;
}
