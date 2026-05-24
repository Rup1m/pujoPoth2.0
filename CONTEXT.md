# PujoPoth (পুজোপথ) — Project Context

> **Durga Puja pandal navigator for Kolkata.** Full-screen Google Map with pandal/metro markers, search, filtering, directions, bilingual UI (English/Bengali), and Firebase backend.

## Quick Reference

| Item | Value |
|---|---|
| **Framework** | Next.js 15.3.3 (App Router, RSC, Turbopack) | 
| **Language** | TypeScript 5, React 18 |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui (Radix primitives) |
| **Database** | Cloud Firestore (`pandals`, `Metro` collections) |
| **Maps** | Google Maps via `@vis.gl/react-google-maps` (Advanced Markers) |
| **AI** | Genkit 1.14 + Google AI (`gemini-2.5-flash`) |
| **Hosting** | Firebase App Hosting (`apphosting.yaml`, max 1 instance) |
| **Analytics** | Google Analytics (gtag via `NEXT_PUBLIC_GA_ID`) |
| **Port** | Dev server runs on `localhost:9002` |

### Commands

```bash
npm run dev          # Start dev server (Turbopack, port 9002)
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run db:seed      # Seed Firestore from scripts/pandal-data.json
npm run genkit:dev   # Start Genkit dev UI
```

---

## Architecture Overview

```
src/
├── app/                    # Next.js App Router (single route: /)
│   ├── layout.tsx          # Root: fonts, LanguageProvider, Toaster, GA
│   ├── page.tsx            # Server component: fetches pandals → PujoMap (ISR 600s)
│   └── globals.css         # CSS variables (HSL design tokens, light/dark)
├── components/
│   ├── pujo-map.tsx        # ★ Orchestrator (client, wires hooks + children)
│   ├── map-container.tsx   # Pure map rendering (markers, location dot) — memo'd
│   ├── map-controls.tsx    # Floating action buttons (filter, recenter, etc.) — memo'd
│   ├── pandal-hub.tsx      # Info card on pandal select (directions, suggestions)
│   ├── pandal-search.tsx   # Autocomplete search bar (client-side filter)
│   ├── pandal-marker.tsx   # SVG pin / metro icon (memo'd)
│   ├── filter-panel.tsx    # Bottom sheet: zone/bonedi/metro filters
│   ├── splash-screen.tsx   # Animated brand splash (1.2s animation floor, callback-gated)
│   ├── language-onboarding.tsx  # First-run language picker
│   ├── language-switcher.tsx    # Runtime EN/BN toggle (dropdown)
│   ├── about-panel.tsx     # Bottom sheet with social links
│   ├── google-analytics.tsx # GA4 script injection
│   └── ui/                 # 32 shadcn/ui primitives (DO NOT hand-edit)
├── hooks/
│   ├── use-location.ts     # GPS / geolocation state machine (extracted from pujo-map)
│   ├── use-directions.ts   # Directions fetch via Genkit flow (extracted from pujo-map)
│   ├── use-language.tsx    # LanguageContext (localStorage-persisted)
│   ├── use-debounce.ts     # Generic debounce hook
│   ├── use-mobile.tsx      # Breakpoint 768px detection
│   └── use-toast.ts        # Toast state manager (shadcn)
├── lib/
│   ├── firebase-config.ts  # Client-side Firebase init (singleton)
│   ├── types.ts            # Pandal type definition
│   ├── analytics.ts        # Type-safe GA4 event tracker (trackEvent)
│   ├── locales.ts          # EN/BN translation strings
│   └── utils.ts            # cn(), haversineDistance(), calculateWalkingTime(), formatDistance()
├── services/
│   └── pandalService.ts    # Firestore fetch (React.cache, ISR via page revalidate) + filter
├── ai/
│   ├── genkit.ts           # Genkit AI instance (googleai/gemini-2.5-flash)
│   ├── dev.ts              # Dev entrypoint (imports flows)
│   └── flows/
│       └── get-directions-flow.ts  # Server action: Google Directions API (walking/driving/transit)
└── scripts/
    └── seed.ts             # Alt seed script (src-side)
scripts/
├── seed.ts                 # Firebase Admin seed: pandal-data.json → Firestore
└── pandal-data.json        # ~21KB source-of-truth pandal dataset
```

---

## Core Data Model

### `Pandal` type (`src/lib/types.ts`)

```ts
type Pandal = {
  id: string;
  name: string;              // English name
  name_lowercase: string;    // Pre-computed for search
  name_bengali: string;      // Bengali name
  name_bengali_lowercase: string;
  latitude: number;
  longitude: number;
  type: "popular" | "regular" | "metro";
  zone: "North" | "South" | "Central" | null;
  bonedi: boolean;           // Heritage/traditional puja
};
```

### `Filters` interface (`src/components/filter-panel.tsx`)

```ts
interface Filters {
  north: boolean; south: boolean; central: boolean;
  bonedi: boolean; metro: boolean;
}
```

**Filter logic:** Zone filters are mutually exclusive. Selecting `metro` hides all pandals and shows only metro stations. `bonedi` stacks with zone but is mutually exclusive with `metro`.

### `DirectionsOutput` (`src/ai/flows/get-directions-flow.ts`)

```ts
type DirectionsOutput = {
  walking: string | null;   // e.g. "12 mins"
  driving: string | null;
  transit: string | null;
};
```

---

## Component Interaction Flow

```
page.tsx (SSR, ISR revalidate=600s)
  └─ getPandals() → Firestore fetch (React.cache deduplication)
     └─ PujoMap (client orchestrator)
           ├─ SplashScreen (1.2s animation floor, callback-gated)
           ├─ LanguageOnboarding (if no localStorage 'lang')
           ├─ useLocation() → GPS state machine
           ├─ useDirections() → travel-time fetcher
           └─ APIProvider + MapCore
                 ├─ PandalSearch (custom event → pandalSelected)
                 ├─ MapContainer (memo'd, pure rendering)
                 │     ├─ User location marker (pulsing)
                 │     └─ PandalMarker[] (SVG pins, memo'd)
                 ├─ PandalHub (on select: directions + suggestions)
                 ├─ MapControls (memo'd)
                 │     ├─ FilterPanel (Sheet)
                 │     ├─ LanguageSwitcher (Dropdown)
                 │     ├─ Recenter button
                 │     └─ AboutPanel (Sheet)
                 └─ analytics.ts → trackEvent() on user interactions
```

**Key patterns:**
- **CustomEvent bridge:** `PandalSearch` fires `window.dispatchEvent(new CustomEvent('pandalSelected'))` — `MapCore` listens via `useEffect`. Avoids prop-drilling between siblings.
- **Dynamic imports:** `PandalHub` and `MapCore` are dynamically imported (`next/dynamic`, `ssr: false`) with Skeleton fallbacks.
- **Server action:** `getDirections()` is a `'use server'` Genkit flow that calls Google Directions API server-side.

---

## Design System

### Color Palette (HSL CSS variables in `globals.css`)

| Token | Light | Role |
|---|---|---|
| `--primary` | `35 100% 58%` | Saffron (#FF9933) — festive accent |
| `--accent` | `216 100% 41%` | Deep blue (#0047AB) — CTAs, buttons |
| `--background` | `48 83% 94%` | Light beige |
| `--foreground` | `224 71% 10%` | Dark text |
| `--destructive` | `0 72% 51%` | Red — errors, bonedi markers |

Dark mode is defined (`.dark` class) but not actively toggled in UI.

### Typography

| Font | Usage |
|---|---|
| `PT Sans` (400, 700) | Body + headlines (`font-body`, `font-headline`) |
| `Dancing Script` (700) | Calligraphic branding (`font-calligraphy`) for "Pujo" in logo |
| `monospace` | Code blocks (`font-code`) |

### Custom Animations (in `tailwind.config.ts`)

| Animation | Used In |
|---|---|
| `travel-fade` | Loading heartbeat SVG in PujoMap |
| `pulse-marker` | User location dot |
| `fade-in` / `fade-in-up` | Search dropdown, PandalHub entry |
| `smooth-reveal` | Splash screen brand text |
| `road-flow` | Splash screen road SVG |

---

## Environment Variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JS + Directions API |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client SDK auth |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `pujopath-navigator` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app identifier |
| `GOOGLE_API_KEY` (`.env`) | Genkit server-side AI key |
| `NEXT_PUBLIC_GA_ID` | Google Analytics tracking ID (optional) |

---

## Firestore Schema

| Collection | Fields | Access |
|---|---|---|
| `pandals` | All `Pandal` fields | Public read, no client write |
| `Metro` | Same shape as `Pandal` (type = 'metro') | Public read, no client write |

Seeding: `npm run db:seed` reads `scripts/pandal-data.json` → batch-writes to `pandals` collection via Firebase Admin SDK (requires `gcloud auth application-default login`).

---

## Important Caveats

1. **`React.cache()` + ISR**: `getPandals()` uses `React.cache()` for request-level deduplication. Page-level `revalidate = 600` controls ISR regeneration. This replaces the previous `unstable_cache` (experimental API).

2. **TypeScript/ESLint ignored in builds**: `next.config.ts` sets `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`. Build will succeed even with type errors — run `npm run typecheck` manually.

3. **Single page app**: Only one route (`/`). The entire UI is the map. No routing/navigation needed.

4. **shadcn/ui components** (`src/components/ui/`): Auto-generated by shadcn CLI. Do NOT manually edit these files. To add new ones: `npx shadcn@latest add <component-name>`.

5. **`use server` + Genkit flow**: `get-directions-flow.ts` is marked `'use server'` — it runs on the server as a Next.js Server Action. The Google Directions API key is accessed server-side via `process.env`.

6. **CustomEvent communication**: Search → Map communication uses `window.dispatchEvent`. This pattern breaks in SSR — only works because both components render client-side (`'use client'`).

7. **Geolocation fallback**: If location is denied/unavailable, the map still renders centered on Kolkata (`22.5726, 88.3639`). Status transitions to `"success"` regardless of geolocation outcome.

8. **Map styling**: POI and transit labels are hidden via map `styles` option. Map uses `mapId: "a3b2b1c3d4e5f6a1"` for Advanced Markers.

9. **Language persistence**: Language choice stored in `localStorage('lang')`. First-time users see `LanguageOnboarding`; returning users skip to splash.

10. **Path alias**: `@/*` maps to `./src/*` (configured in `tsconfig.json`). All imports use `@/` prefix.

---

## Extending the Application

### Adding a new component
1. Create file in `src/components/` with `"use client"` directive.
2. Import into `pujo-map.tsx` (consider `next/dynamic` for heavy components).
3. Use existing design tokens (`hsl(var(--primary))`, etc.) and shadcn/ui primitives.

### Adding a new Genkit AI flow
1. Create flow file in `src/ai/flows/` with `'use server'` directive.
2. Define Zod input/output schemas.
3. Use `ai.defineFlow()` from `@/ai/genkit`.
4. Export a wrapper function. Import in `src/ai/dev.ts` for Genkit dev UI.

### Adding a new translation key
1. Add the key to both `en` and `bn` objects in `src/lib/locales.ts`.
2. Access via `const { text } = useLanguage()` → `text.newKey`.

### Adding a new filter
1. Add boolean to `Filters` interface in `filter-panel.tsx`.
2. Add checkbox UI in the same component.
3. Update filter logic in `pandalService.ts` → `getFilteredPandals()`.

### Adding a new Pandal field
1. Update `Pandal` type in `src/lib/types.ts`.
2. Update `scripts/pandal-data.json` with new field data.
3. Re-seed database: `npm run db:seed`.
4. Update consuming components (e.g., `pandal-hub.tsx`, `pandal-marker.tsx`).
