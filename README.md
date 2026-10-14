# FLOMIRA

FLOMIRA is a rose-gold cake experience with a storefront preview layered onto the original scroll-scrubbed home scene.

The shop is intentionally a preview until the business details and order channel are configured:

- The collection supports search, category filters, sorting, product options, sample pricing, and editorial imagery.
- Favorites and the cart persist in the current browser profile only.
- Checkout creates a local order draft only after explicit consent. It does not submit, reserve, or take payment.
- Contact creates an inquiry text draft that can be copied or downloaded; it does not send messages.
- Saved drafts can be reviewed, printed, or removed from `/orders`.

All current products, USD prices, portions, allergen notes, lead times, contact details, and availability are sample or to-be-confirmed information.

## Getting Started

Run the development server from this directory:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Routes

- `/` — original cinematic cake experience
- `/products` — searchable collection
- `/favorites` — browser-local saved concepts
- `/cart` — browser-local preview cart
- `/checkout` — local order planner
- `/orders` — saved local drafts
- `/contact` — unsent custom inquiry draft
- `/faq` — storefront preview guidance

## Cinematic presentation

- Scene copy begins in the upper third with a bounded, scrollable area for small screens and zoomed text. Its scroll animation moves only a small offset, not the layout anchor.
- The prominent rose-gold **Order now** link starts a 760 ms camera-push exit, then uses Next.js navigation to `/products`. The scene first zooms sharply to 1.12×, then pushes to 1.24× while blurring to 14 px. The collection arrives at 1.14× with matching blur, then settles into full focus and normal scale over 860 ms. Header/navigation stay steady, and normal content is clear when animations finish or are disabled.
- The exit's CSS duration and navigation deadline share one constant. Modified clicks still open tabs normally; keyboard activation skips the exit delay, and reduced motion and print disable zoom and blur entirely.
- Navigation prefetches on hover/focus. Cleanup cancels the exit timer, and failed navigation restores the page rather than leaving a hidden or disabled screen.
- The footage's display grade lifts saturation and brightness and uses lighter, localized shading behind copy. It does not upscale or re-encode the source clips: the inspected first clip and source are both 1280×720. Higher-resolution source footage is needed for real extra detail.
- Connectors play at 2×, then the next scene plays from its first frame at the same rate until its heading is readable. The opening is no longer skipped by jumping directly to the 18% handoff position. Stage lengths remain 2.8–3 viewport-heights.
- Opening copy and scroll position follow the actual media clock, including each scene's linger easing. Playback pauses at the displayed frame before returning to manual scrubbing; it does not seek backwards to the threshold. If the next clip buffers, the connector's final frame stays visible until the opening is ready. Failed playback or loading releases the scroll lock rather than pretending the opening finished.

## Checks

```bash
node --test tests/scroll-engine.test.mjs tests/connector-continuity.test.mjs tests/order-navigation.test.mjs
node --experimental-strip-types --test tests/content-pacing.test.mjs
node --check src/components/scrub-engine.js
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

The media-clock tests distinguish native playback from seeks and cover eased handoff, buffering, pending reset seeks, mobile ownership, cancellation, failures, and cleanup. They do not measure real browser decoding or dropped frames. For a visual smoke check, scroll through a connector on `/`: the next scene should begin at its opening frame, its text should fade in as playback continues, and scrolling should resume without a jump. Repeat on mobile and try **Order now** during the opening.

For the page transition, click **Order now** with a pointer: the scene should zoom before losing focus, switch to a blurred/zoomed collection, then settle clearly. Repeat with reduced motion enabled (no zoom/blur) and use browser Back to confirm the home scene is not left blurred. Navigation tests check the animation phases, matched exit deadline, accessible fallbacks, and cancellation; they do not replace a real-browser visual check.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
