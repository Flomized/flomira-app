'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CherryBlossomStream from '@/components/effects/CherryBlossomStream';
import { useBusinessSettings } from '@/components/BusinessSettingsProvider';
import { getWhatsAppUrl, normalizeWhatsAppNumber } from '@/lib/whatsapp';

interface Channel {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  badge?: string;
  iconType: 'whatsapp' | 'facebook' | 'instagram' | 'youtube' | 'gmail' | 'phone' | 'catalog';
  accentColor: string;
  glowColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  webUrl: string;
  scheme: string;
  copyValue?: string;
  copyLabel?: string;
  isSpecial?: boolean;
}

interface DeepLinkParams {
  channel: Channel;
  ytHandle: string;
  ytUrl: string;
  fbPage: string;
  fbUrl: string;
  igUsername: string;
  igUrl: string;
  rawEmail: string;
  rawPhone: string;
  waUrl: string;
}

// Robust external handler: opens in native app if installed, otherwise seamlessly falls back to web
function executeDeepLink(e: React.MouseEvent, params: DeepLinkParams) {
  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
  const { channel, ytHandle, ytUrl, fbPage, fbUrl, igUsername, igUrl, rawEmail, rawPhone, waUrl } = params;

  if (channel.id === 'catalog') {
    return; // Internal Next.js Link
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isAndroid || isIOS;

  if (!isMobile) {
    return; // Desktop: default <a> target="_blank" opens official website in new tab
  }

  e.preventDefault();

  // 1. Android: Native Intent URI with OS-level browser_fallback_url
  // If the app is installed, Android switches to it instantly.
  // If not installed, Chrome immediately opens the web fallback URL with zero errors.
  if (isAndroid) {
    if (channel.id === 'youtube') {
      window.location.href = `intent://www.youtube.com/${ytHandle}#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=${encodeURIComponent(ytUrl)};end;`;
      return;
    }
    if (channel.id === 'facebook') {
      window.location.href = `intent://facebook.com/${fbPage}#Intent;package=com.facebook.katana;scheme=https;S.browser_fallback_url=${encodeURIComponent(fbUrl)};end;`;
      return;
    }
    if (channel.id === 'instagram') {
      window.location.href = `intent://instagram.com/_u/${igUsername}#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=${encodeURIComponent(igUrl)};end;`;
      return;
    }
    if (channel.id === 'whatsapp') {
      window.location.href = waUrl;
      return;
    }
    if (channel.id === 'gmail') {
      window.location.href = `intent://#Intent;action=android.intent.action.SENDTO;data=mailto:${encodeURIComponent(rawEmail)}?subject=${encodeURIComponent('Cake Inquiry - FLOMIRA')};package=com.google.android.gm;S.browser_fallback_url=${encodeURIComponent(`https://mail.google.com/mail/?view=cm&fs=1&to=${rawEmail}&su=Cake Inquiry - FLOMIRA`)};end;`;
      return;
    }
    if (channel.id === 'phone') {
      window.location.href = `tel:${rawPhone.replace(/\s+/g, '')}`;
      return;
    }
  }

  // 2. iOS: Attempt app URI scheme with smart visibility fallback
  // If the app is installed, iOS launches the app immediately and hides the web page.
  // If the app is not installed, it falls back to loading the web URL directly.
  if (isIOS) {
    if (channel.id === 'whatsapp') {
      window.location.href = waUrl;
      return;
    }
    if (channel.id === 'phone') {
      window.location.href = `tel:${rawPhone.replace(/\s+/g, '')}`;
      return;
    }

    let appScheme = channel.scheme;
    if (channel.id === 'youtube') {
      appScheme = `youtube://www.youtube.com/${ytHandle}`;
    } else if (channel.id === 'facebook') {
      appScheme = `fb://facewebmodal/f?href=${encodeURIComponent(fbUrl)}`;
    } else if (channel.id === 'instagram') {
      appScheme = `instagram://user?username=${igUsername}`;
    } else if (channel.id === 'gmail') {
      appScheme = `googlegmail:///co?to=${rawEmail}&subject=${encodeURIComponent('Cake Inquiry - FLOMIRA')}`;
    }

    let appOpened = false;
    const markOpened = () => {
      appOpened = true;
    };

    window.addEventListener('pagehide', markOpened, { once: true });
    const handleVisibility = () => {
      if (document.hidden) appOpened = true;
    };
    document.addEventListener('visibilitychange', handleVisibility, { once: true });

    const startTime = Date.now();
    window.location.href = appScheme;

    window.setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibility);
      // If page is still visible and less than 1.8s elapsed, app wasn't opened -> load web URL
      if (!appOpened && !document.hidden && Date.now() - startTime < 1800) {
        window.location.href = channel.webUrl;
      }
    }, 500);
    return;
  }

  // 3. General fallback
  window.location.href = channel.webUrl;
}

export default function ReachUsView() {
  const { settings } = useBusinessSettings();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const getPageUrl = () => {
    return typeof window !== 'undefined' ? window.location.href : 'https://flomira.com/reachus';
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 2800);
  };

  const copyToClipboard = (text: string, label: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(`${label} copied to clipboard! ✨`);
        if (navigator.vibrate) navigator.vibrate(20);
      }).catch(() => {
        showToast(`Could not copy ${label}`);
      });
    } else {
      showToast(`Copy: ${text}`);
    }
  };

  const handleShare = async () => {
    const currentUrl = getPageUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FLOMIRA Atelier | Reach Us',
          text: 'Connect with FLOMIRA: WhatsApp, Facebook, Instagram, YouTube & Custom Cake Orders.',
          url: currentUrl,
        });
        return;
      } catch {
        // User cancelled or unsupported share target
      }
    }
    copyToClipboard(currentUrl, 'Page link');
  };

  const downloadVCard = () => {
    const businessName = settings?.businessName?.trim() || 'FLOMIRA Atelier';
    const phone = settings?.phoneNumber?.trim() || '+8801621084775';
    const email = settings?.email?.trim() || 'flomira0910@gmail.com';
    const website = getPageUrl();

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${businessName}`,
      `ORG:${businessName}`,
      'TITLE:Artisan Rose-Gold Cake Studio',
      `TEL;TYPE=CELL,VOICE:${phone}`,
      `EMAIL;TYPE=INTERNET,PREF:${email}`,
      `URL:${website}`,
      'NOTE:Official FLOMIRA Atelier Link Hub - Handcrafted Celebrations & Sweet Delights',
      'END:VCARD',
    ].join('\r\n');

    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flomira-atelier-contact.vcf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('FLOMIRA contact file (.vcf) downloaded! 📇');
  };

  // Helper to extract clean bare handle (guarantees no leading '@' repetitions)
  const getBareHandle = (urlOrHandle: string | undefined, defaultHandle: string) => {
    if (!urlOrHandle || !urlOrHandle.trim()) {
      return defaultHandle.replace(/^@+/, '');
    }
    const trimmed = urlOrHandle.trim();
    if (!trimmed.startsWith('http')) {
      return trimmed.replace(/^@+/, '');
    }
    try {
      const parsed = new URL(trimmed);
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        return parts[parts.length - 1].replace(/^@+/, '');
      }
      return defaultHandle.replace(/^@+/, '');
    } catch {
      return defaultHandle.replace(/^@+/, '');
    }
  };

  // Dynamic values with elegant Flomira defaults
  const businessName = settings?.businessName?.trim() || 'FLOMIRA';
  const description = settings?.description?.trim() || 'Artisan Rose-Gold Cakes & Thoughtful Celebrations';
  const rawEmail = settings?.email?.trim() || 'flomira0910@gmail.com';
  const rawPhone = settings?.phoneNumber?.trim() || '+8801621084775';
  const rawWhatsApp = settings?.whatsappNumber || '8801621084775';

  const rawFb = settings?.socialMedia?.facebook?.trim() || 'https://www.facebook.com/flomira0910';
  const rawIg = settings?.socialMedia?.instagram?.trim() || 'https://www.instagram.com/flomira0910';
  const rawYt = settings?.socialMedia?.youtube?.trim() || 'https://www.youtube.com/@flomira0910';

  const fbPage = getBareHandle(rawFb, 'flomira0910');
  const igUsername = getBareHandle(rawIg, 'flomira0910');
  const ytUsername = getBareHandle(rawYt, 'flomira0910');
  const ytHandle = `@${ytUsername}`;

  const fbUrl = rawFb.startsWith('http') ? rawFb : `https://www.facebook.com/${fbPage}`;
  const igUrl = rawIg.startsWith('http') ? rawIg : `https://www.instagram.com/${igUsername}`;
  const ytUrl = rawYt.startsWith('http') ? rawYt : `https://www.youtube.com/${ytHandle}`;

  const waDigits = normalizeWhatsAppNumber(rawWhatsApp) || '8801621084775';
  const waUrl = getWhatsAppUrl(waDigits, 'Hello FLOMIRA! I would like to inquire about your cakes.') || `https://wa.me/${waDigits}`;

  const channels: Channel[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      title: 'WhatsApp Direct Chat',
      subtitle: 'Instant messages, quick inquiries & order confirmation',
      badge: 'Online & Active',
      iconType: 'whatsapp',
      accentColor: 'from-[#25D366] to-[#128C7E]',
      glowColor: 'rgba(37, 211, 102, 0.35)',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400/70',
      badgeBg: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300',
      badgeText: 'Live Chat',
      webUrl: waUrl,
      scheme: `whatsapp://send?phone=${waDigits}&text=${encodeURIComponent('Hello FLOMIRA! I would like to inquire about your cakes.')}`,
      copyValue: waDigits,
      copyLabel: 'WhatsApp number',
    },
    {
      id: 'facebook',
      name: 'Facebook Page',
      title: 'Official Facebook Page',
      subtitle: 'Community updates, reviews, photo galleries & drops',
      badge: fbPage ? `@${fbPage}` : '@flomira0910',
      iconType: 'facebook',
      accentColor: 'from-[#1877F2] to-[#0A53BE]',
      glowColor: 'rgba(24, 119, 242, 0.35)',
      borderColor: 'border-blue-500/30 hover:border-blue-400/70',
      badgeBg: 'bg-blue-950/80 border-blue-500/30 text-blue-300',
      badgeText: 'Opens in App',
      webUrl: fbUrl,
      scheme: `fb://facewebmodal/f?href=${encodeURIComponent(fbUrl)}`,
      copyValue: fbUrl,
      copyLabel: 'Facebook link',
    },
    {
      id: 'youtube',
      name: 'YouTube',
      title: 'YouTube Channel',
      subtitle: 'Cake decorating masterclasses, reveals & studio stories',
      badge: ytHandle,
      iconType: 'youtube',
      accentColor: 'from-[#FF0000] to-[#C4302B]',
      glowColor: 'rgba(255, 0, 0, 0.35)',
      borderColor: 'border-red-500/30 hover:border-red-400/70',
      badgeBg: 'bg-red-950/80 border-red-500/30 text-red-300',
      badgeText: 'Opens in App',
      webUrl: ytUrl,
      scheme: `vnd.youtube://www.youtube.com/${ytHandle}`,
      copyValue: ytUrl,
      copyLabel: 'YouTube channel',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      title: 'Instagram Gallery',
      subtitle: 'Artisan cake reels, behind-the-scenes stories & aesthetics',
      badge: `@${igUsername}`,
      iconType: 'instagram',
      accentColor: 'from-[#833AB4] via-[#FD1D1D] to-[#F77737]',
      glowColor: 'rgba(253, 29, 29, 0.35)',
      borderColor: 'border-pink-500/30 hover:border-pink-400/70',
      badgeBg: 'bg-pink-950/80 border-pink-500/30 text-pink-300',
      badgeText: 'Opens in App',
      webUrl: igUrl,
      scheme: `instagram://user?username=${igUsername}`,
      copyValue: igUrl,
      copyLabel: 'Instagram profile',
    },
    {
      id: 'gmail',
      name: 'Gmail / Email',
      title: 'Direct Atelier Email',
      subtitle: 'Custom bespoke event proposals, tastings & inquiries',
      badge: rawEmail,
      iconType: 'gmail',
      accentColor: 'from-[#EA4335] via-[#FBBC05] to-[#34A853]',
      glowColor: 'rgba(234, 67, 53, 0.32)',
      borderColor: 'border-amber-500/30 hover:border-amber-400/70',
      badgeBg: 'bg-amber-950/80 border-amber-500/30 text-amber-300',
      badgeText: 'Compose',
      webUrl: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(rawEmail)}&su=${encodeURIComponent('Cake Inquiry - FLOMIRA')}`,
      scheme: `mailto:${rawEmail}?subject=${encodeURIComponent('Cake Inquiry - FLOMIRA')}`,
      copyValue: rawEmail,
      copyLabel: 'Email address',
    },
    {
      id: 'phone',
      name: 'Studio Phone',
      title: 'Direct Phone Call',
      subtitle: 'Speak directly with our studio team for order consultations',
      badge: rawPhone,
      iconType: 'phone',
      accentColor: 'from-[#C99A80] to-[#B76E79]',
      glowColor: 'rgba(201, 154, 128, 0.35)',
      borderColor: 'border-[#C99A80]/30 hover:border-[#E8A0B0]/70',
      badgeBg: 'bg-[#241E1E] border-[#C99A80]/40 text-[#F6EDE4]',
      badgeText: 'Call Studio',
      webUrl: `tel:${rawPhone.replace(/\s+/g, '')}`,
      scheme: `tel:${rawPhone.replace(/\s+/g, '')}`,
      copyValue: rawPhone,
      copyLabel: 'Phone number',
    },
    {
      id: 'catalog',
      name: 'Explore Collection',
      title: 'Browse Cake Menu & Order',
      subtitle: 'Explore our artisan flavors, signature designs & online cart',
      badge: 'FLOMIRA Storefront',
      iconType: 'catalog',
      accentColor: 'from-[#E8A0B0] via-[#B76E79] to-[#C99A80]',
      glowColor: 'rgba(183, 110, 121, 0.45)',
      borderColor: 'border-[#E8A0B0]/50 hover:border-[#F6EDE4]/90',
      badgeBg: 'bg-[#B76E79]/20 border-[#E8A0B0]/40 text-[#F6EDE4]',
      badgeText: 'Visit Menu →',
      webUrl: '/products',
      scheme: '/products',
      isSpecial: true,
    },
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#0D0D0D] text-[#F6EDE4] overflow-x-hidden selection:bg-[#B76E79] selection:text-[#0D0D0D] font-sans">
      {/* Dynamic Ambient Glow Backdrops */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Top Rose Gold Orb */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[28rem] sm:w-[38rem] h-[28rem] sm:h-[38rem] rounded-full bg-gradient-to-br from-[#B76E79]/25 via-[#E8A0B0]/15 to-transparent blur-[90px] animate-reachus-float" />
        {/* Right Copper Orb */}
        <div className="absolute top-[35%] -right-28 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-gradient-to-tl from-[#C99A80]/20 via-[#B76E79]/10 to-transparent blur-[85px] animate-reachus-float-reverse" />
        {/* Bottom Left Blush Orb */}
        <div className="absolute -bottom-24 -left-20 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-gradient-to-tr from-[#E8A0B0]/15 via-transparent to-transparent blur-[80px] animate-reachus-float" />
        {/* Subtle Stardust Mesh Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Infinite Falling Cherry Blossom Stream (Matching FLOMIRA Mobile App) */}
      <CherryBlossomStream count={36} />

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-lg px-4 pt-10 pb-20 sm:pt-14 sm:pb-24">
        {/* Header / Brand Profile Section */}
        <header className="flex flex-col items-center text-center">
          {/* Avatar with Rotating Metallic Ring */}
          <div className="relative group cursor-pointer" onClick={() => setShowQrModal(true)} title="Tap to view QR Code">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-[#B76E79] via-[#E8A0B0] to-[#C99A80] opacity-80 blur-sm group-hover:opacity-100 transition duration-500 animate-reachus-spin" />
            <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#141414] border-2 border-white/20 shadow-2xl p-2 overflow-hidden">
              {/* Authentic FLOMIRA Official Cake Emblem */}
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#241E1E] via-[#1A1A1A] to-[#0D0D0D] flex items-center justify-center overflow-hidden">
                <Image
                  src="/assets/flomira-emblem.webp"
                  alt={businessName}
                  width={240}
                  height={240}
                  priority
                  className="w-full h-full object-contain p-1 filter drop-shadow-[0_4px_16px_rgba(183,110,121,0.5)] group-hover:scale-105 transition-transform duration-500"
                />
                {/* Shimmer sweep */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              </div>
            </div>

            {/* Verified atelier badge */}
            <div
              className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-gradient-to-br from-[#E8A0B0] to-[#B76E79] border-2 border-[#0D0D0D] flex items-center justify-center shadow-lg"
              title="Verified Official Atelier"
            >
              <svg className="w-4 h-4 text-[#0D0D0D]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Official FLOMIRA Brand Name & Logo Signature */}
          <div className="mt-5 flex flex-col items-center">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-[0.16em] text-transparent bg-clip-text bg-gradient-to-r from-[#F6EDE4] via-[#E8A0B0] to-[#C99A80] drop-shadow-sm flex items-center justify-center">
              <span>FL</span>
              <span className="relative inline-flex items-center justify-center px-[0.04em]">
                <span>O</span>
                <span className="absolute text-[0.42em] text-[#E8A0B0] pb-0.5">♥</span>
              </span>
              <span>MIRA</span>
            </h1>
            <p className="mt-1 text-[11px] sm:text-xs font-medium tracking-[0.22em] text-[#C99A80] uppercase flex items-center gap-2">
              <span className="text-[#B76E79]">❧</span>
              <span>Cakes Made With Love</span>
              <span className="text-[#B76E79]">❧</span>
            </p>
          </div>

          {/* Tagline / Subtitle */}
          <p className="mt-2 text-sm sm:text-base text-[#C4B5A8] max-w-sm leading-relaxed">
            {description}
          </p>

          {/* Live Studio Badge */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-medium text-[#F6EDE4]/90 backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Studio Open &middot; Direct Channels</span>
          </div>

          {/* Top Quick Actions Bar */}
          <div className="mt-5 flex items-center justify-center gap-2.5">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-medium text-[#F6EDE4] transition duration-200 active:scale-95"
              aria-label="Share this link hub"
            >
              <svg className="w-3.5 h-3.5 text-[#E8A0B0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Share</span>
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-medium text-[#F6EDE4] transition duration-200 active:scale-95"
              aria-label="View QR Code"
            >
              <svg className="w-3.5 h-3.5 text-[#C99A80]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>QR Code</span>
            </button>

            <button
              onClick={downloadVCard}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-medium text-[#F6EDE4] transition duration-200 active:scale-95"
              aria-label="Save contact card to phone"
            >
              <svg className="w-3.5 h-3.5 text-[#B76E79]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Save Contact</span>
            </button>
          </div>
        </header>

        {/* Channels List */}
        <section className="mt-8 space-y-3.5" aria-label="Official reach channels">
          {channels.map((channel, index) => {
            const isCatalog = channel.id === 'catalog';

            const CardContent = (
              <div
                className={`group relative overflow-hidden rounded-2xl border ${channel.borderColor} ${
                  channel.isSpecial
                    ? 'bg-gradient-to-r from-[#241E1E]/95 via-[#1A1A1A]/95 to-[#241E1E]/95 shadow-[0_10px_35px_-10px_rgba(183,110,121,0.35)]'
                    : 'bg-[#141414]/80 backdrop-blur-xl hover:bg-[#1A1A1A]/90 shadow-[0_8px_30px_rgb(0,0,0,0.3)]'
                } p-4 sm:p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98] animate-reachus-fade-up`}
                style={{ animationDelay: `${index * 65}ms` }}
              >
                {/* Ambient glow accent behind icon on hover */}
                <div
                  className="pointer-events-none absolute -left-10 -top-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
                  style={{ background: channel.glowColor }}
                />

                {/* Shimmer line sweep */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

                <div className="relative flex items-center justify-between gap-3.5">
                  {/* Left: Icon & Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Brand Icon Box */}
                    <div
                      className={`relative flex items-center justify-center shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${channel.accentColor} text-white shadow-md shadow-black/40 group-hover:scale-105 transition-transform duration-300`}
                    >
                      {renderChannelIcon(channel.iconType)}
                    </div>

                    {/* Text Details */}
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-[#F6EDE4] group-hover:text-white transition-colors truncate">
                          {channel.title}
                        </h2>
                      </div>
                      <p className="text-xs text-[#C4B5A8] group-hover:text-[#F6EDE4]/80 transition-colors line-clamp-1 mt-0.5">
                        {channel.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right: Badge / Action Pill & Copy Shortcut */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {channel.copyValue && (
                      <button
                        type="button"
                        onClick={(e) => copyToClipboard(channel.copyValue!, channel.copyLabel || channel.name, e)}
                        className="p-2 rounded-xl text-[#C4B5A8] hover:text-[#F6EDE4] hover:bg-white/10 transition-colors opacity-75 group-hover:opacity-100"
                        title={`Copy ${channel.copyLabel || channel.name}`}
                        aria-label={`Copy ${channel.copyLabel || channel.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    )}

                    <div
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${channel.badgeBg} group-hover:brightness-110 transition-all`}
                    >
                      <span>{channel.badgeText}</span>
                      <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            );

            if (isCatalog) {
              return (
                <Link
                  key={channel.id}
                  href="/products"
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A0B0] rounded-2xl"
                >
                  {CardContent}
                </Link>
              );
            }

            return (
              <a
                key={channel.id}
                href={channel.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) =>
                  executeDeepLink(e, {
                    channel,
                    ytHandle,
                    ytUrl,
                    fbPage,
                    fbUrl,
                    igUsername,
                    igUrl,
                    rawEmail,
                    rawPhone,
                    waUrl,
                  })
                }
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A0B0] rounded-2xl"
              >
                {CardContent}
              </a>
            );
          })}
        </section>

        {/* Footer Note */}
        <footer className="mt-12 text-center text-xs text-[#C4B5A8]/70 space-y-2">
          <p className="font-serif tracking-widest text-[#E8A0B0]/80 uppercase">
            FLOMIRA CAKE ATELIER
          </p>
          <p>
            Scanned via QR Code &middot; Official Authenticated Linktree
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="text-[#C99A80] hover:text-[#E8A0B0] underline underline-offset-4 transition-colors"
            >
              Visit full website experience &rarr;
            </Link>
          </div>
        </footer>
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] border border-[#B76E79]/50 text-[#F6EDE4] text-xs sm:text-sm font-medium shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md animate-reachus-fade-up"
        >
          <span className="w-2 h-2 rounded-full bg-[#E8A0B0]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Scannable QR Code Modal */}
      {showQrModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-reachus-fade-up"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-[#141414] border border-[#B76E79]/40 p-6 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-[#C4B5A8] hover:text-[#F6EDE4] hover:bg-white/10 transition-colors"
              aria-label="Close QR Modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Header */}
            <h3 id="qr-modal-title" className="font-serif text-2xl font-bold text-[#F6EDE4]">
              FLOMIRA QR Code
            </h3>
            <p className="mt-1 text-xs text-[#C4B5A8]">
              Scan to open this instant reach hub on any smartphone
            </p>

            {/* QR Visual Box with Rose Gold Framing */}
            <div className="relative mt-6 p-4 rounded-2xl bg-white flex flex-col items-center justify-center shadow-inner overflow-hidden">
              {/* High Definition QR Code */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(getPageUrl())}&color=0d0d0d&bgcolor=ffffff&qzone=2`}
                alt="FLOMIRA Reach Us QR Code"
                className="w-56 h-56 object-contain rounded-lg"
                loading="eager"
              />

              {/* Center Official Atelier Emblem Badge over QR */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-13 h-13 rounded-2xl bg-[#0D0D0D] border-2 border-[#B76E79] flex items-center justify-center shadow-2xl p-1 overflow-hidden">
                  <Image
                    src="/assets/flomira-emblem.webp"
                    alt="FLOMIRA Logo"
                    width={52}
                    height={52}
                    className="w-full h-full object-contain filter drop-shadow"
                  />
                </div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={() => copyToClipboard(getPageUrl(), 'QR URL')}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#B76E79] to-[#C99A80] hover:brightness-110 text-[#0D0D0D] font-bold text-xs uppercase tracking-wider transition duration-200 active:scale-98 shadow-md"
              >
                Copy Link to Share
              </button>
              <button
                onClick={() => {
                  window.open(`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(getPageUrl())}&color=0d0d0d&bgcolor=ffffff&qzone=4`, '_blank');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[#F6EDE4] text-xs font-semibold transition duration-200"
              >
                Open High-Res QR for Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Pixel-perfect SVG brand marks
function renderChannelIcon(type: Channel['iconType']) {
  switch (type) {
    case 'whatsapp':
      return (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'gmail':
      return (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      );
    case 'phone':
      return (
        <svg className="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      );
    case 'catalog':
      return (
        <svg className="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
  }
}
