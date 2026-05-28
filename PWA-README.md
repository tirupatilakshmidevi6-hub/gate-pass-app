# NxtWave Gate Pass — PWA Implementation Guide

## Overview

This document describes the Progressive Web App (PWA) setup for the NxtWave Gate Pass System.

---

## Files Added / Modified

| File | Purpose |
|------|---------|
| `public/manifest.json` | Web App Manifest — installability, icons, display mode |
| `public/icons/` | All PWA icon sizes (72 → 512px, plus maskable) |
| `next.config.ts` | `@ducanh2912/next-pwa` config with Workbox runtime caching |
| `src/app/layout.tsx` | PWA meta tags, apple-touch-icon links, theme-color |
| `src/app/offline/page.tsx` | Offline fallback page shown when network is unavailable |
| `src/components/pwa/PWAComponents.tsx` | Root client component that loads all PWA UI |
| `src/components/pwa/OfflineToast.tsx` | Orange/green toast when connection changes |
| `src/components/pwa/InstallPrompt.tsx` | "Add to Home Screen" banner with iOS special flow |
| `src/components/pwa/SplashScreen.tsx` | Full-screen splash only shown in standalone PWA mode |
| `src/components/pwa/LoadingBar.tsx` | YouTube-style top progress bar on route navigation |
| `src/components/pwa/NotificationPrompt.tsx` | Friendly prompt to enable push notifications |
| `src/app/api/push/subscribe/route.ts` | Save / delete browser push subscriptions to Supabase |
| `src/app/api/push/send/route.ts` | Send push notifications via web-push / VAPID |
| `scripts/generate-icons.js` | Node script to regenerate icons from SVG using sharp |
| `vercel.json` | Cache-Control headers for sw.js, manifest, icons, _next/static |
| `.env.local` | Added VAPID keys and NEXT_PUBLIC_PWA_ENABLED |

---

## Environment Variables

Add these to `.env.local` and to Vercel project settings:

```env
# Push Notifications (VAPID)
# Generate a fresh key pair with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>          # Keep secret — server only

# PWA feature flag
NEXT_PUBLIC_PWA_ENABLED=true
```

**Vercel:** Project → Settings → Environment Variables. Add `VAPID_PRIVATE_KEY` for Production & Preview environments.

---

## Generating VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Copy the output into `.env.local` and Vercel environment variables.

---

## Regenerating Icons

If you change the brand or logo:

```bash
node scripts/generate-icons.js
```

This creates all required sizes (72 – 512 px) plus a 512×512 maskable variant in `public/icons/`.

---

## Caching Strategy

| Resource | Strategy | Cache Name |
|----------|----------|------------|
| Google Fonts | Cache First (1 year) | `google-fonts` |
| Images, icons, fonts | Cache First (30 days) | `static-assets` |
| `_next/static/**` | Cache First (1 year, immutable) | `next-static` |
| `/api/**` | Network First (5 min fallback) | `api-cache` |
| Dashboard/list pages | Stale-While-Revalidate (1 hr) | `page-cache` |
| Offline fallback | Cache Only (pre-cached) | workbox default |

---

## Push Notifications

### How it works

1. User logs in → `NotificationPrompt` asks permission after 3 s
2. On grant → browser creates a `PushSubscription` (endpoint + keys)
3. Subscription POSTed to `/api/push/subscribe` → saved to `push_subscriptions` table
4. Any API route calls `POST /api/push/send` with a `PushPayload` to notify users

### Database table required

Run in Supabase SQL editor:

```sql
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     text,
  user_type   text,
  endpoint    text unique not null,
  p256dh      text,
  auth        text,
  created_at  timestamptz default now()
);
```

### Sending a push notification from API code

```typescript
// Inside any API route handler:
await fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Gate Pass Approved',
    body: 'Your gate pass for 2026-06-01 has been approved.',
    url: '/entry-list',
    roles: ['admin'],   // optional — target by role
  }),
});
```

---

## PWA Lighthouse Checklist

- [x] `manifest.json` with all required fields
- [x] Icons at 192×192 and 512×512 minimum
- [x] Maskable icon at 512×512
- [x] `theme-color` meta tag
- [x] Service worker registered
- [x] Offline fallback page
- [x] HTTPS (Vercel provides this automatically)
- [x] Responsive viewport meta
- [x] Apple PWA meta tags
- [x] `Service-Worker-Allowed: /` header on `sw.js`

---

## Mobile Optimizations Applied

- Sidebar collapses to hamburger menu on screens < `md` (768 px)
- Bottom navigation bar on mobile shows: Dashboard, New Entry, Approvals, List
- TopNav hides search bar on mobile (tap search icon instead)
- Main layout uses `pb-16 md:pb-0` to clear the bottom nav bar
- Main content area uses `md:ml-56` — no offset on mobile
- All inputs use minimum 16 px font size to prevent iOS auto-zoom
- Offline toast appears at bottom above bottom nav

---

## Development vs Production

- Service worker is **disabled in development** (`disable: process.env.NODE_ENV === 'development'`)
- To test PWA locally: `npm run build && npm run start`
- Service worker requires **HTTPS** — Vercel handles this automatically

---

## Deployment Checklist

1. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Vercel environment variables
2. Run `npm run build` to verify no TypeScript / ESLint errors
3. Deploy to Vercel — service worker and manifest will be active automatically
4. Test install prompt on Android Chrome and iOS Safari
5. Verify Lighthouse PWA score > 90 in Chrome DevTools
