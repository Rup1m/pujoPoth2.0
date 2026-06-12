# PujoPoth (পুজোপথ) — Project Context

> **Durga Puja pandal navigator for Kolkata.** Full-screen Google Map with pandal/metro markers, search, filtering, directions, bilingual UI (English/Bengali), and Firebase backend.

## 🌟 Current Features (Implemented)
- **Interactive Map Engine:** Full-screen Google Map (`@vis.gl/react-google-maps`) with custom SVG markers for 95 pandals and metro stations.
- **Discovery & Search:** Autocomplete search bar, and bottom-sheet filters (Zone: North/South/Central, Heritage: Bonedi, Metro).
- **Navigation & AI:** Real-time geolocation (`useLocation`) and Server-side Genkit AI flows (`get-directions-flow`) for walking/driving/transit times.
- **Bilingual Interface:** English & Bengali (`LanguageContext`, `locales.ts`), persisted via `localStorage` with a first-run onboarding screen.
- **UI/UX:** Responsive bottom sheets (`shadcn/ui`), floating action buttons, animated splash screen (`framer-motion`/Tailwind), and dynamic Pandal Hub cards.
- **Backend Infrastructure:** Firebase Firestore database (read-only client access), `React.cache()` with Next.js ISR (600s), hosted on Firebase App Hosting.

## 🚀 Upcoming Features (Final Product Launch)
*Critical requirements for the next phase of development:*

1. **User Authentication (Firebase Auth):** 
   - One-time Sign-Up / Login flow. Once authenticated, users bypass the auth screen.
   - "Sign Out" button inside the new Account Section. 
   - "Log In" view for returning logged-out users.

2. **Gamified User Account Section:** 
   - **Visited Tracker:** Users can check off/mark pandals they have visited.
   - **Progress Tracking:** A visual completion bar based on visited pandals.
   - **Important Constraint:** Calculations must be strictly out of **95 pandals**. Metro stations **must not** be counted as pandals in this tracker.
   - **Achievements:** Unlockable gamified achievement titles to increase user retention and engagement.

3. **Advanced Google Analytics (GA4):** 
   - Expand current base GA implementation to fetch and analyze user engagement data.
   - Track key product success metrics: Time spent in app, specific feature usage, user retention, and gamification engagement.

## Quick Reference
| Item | Value |
|---|---|
| **Framework** | Next.js 15.3.3 (App Router, RSC, Turbopack) | 
| **Language** | TypeScript 5, React 18 |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui |
| **Database** | Cloud Firestore (`pandals`, `Metro` collections) |
| **AI** | Genkit 1.14 + Google AI (`gemini-2.5-flash`) |
| **Hosting** | Firebase App Hosting |

## Architecture & Data Flow
- **`app/page.tsx`**: Single route Server Component. Fetches pandals via `getPandals()` (ISR 600s).
- **`components/pujo-map.tsx`**: Central Client Orchestrator. Wires hooks, state, and map primitives.
- **`src/ai/flows/`**: Server Actions. `getDirections()` queries Google Directions API safely.
- **Event Bus Pattern**: Sibling components (e.g., `PandalSearch` → `MapCore`) communicate via `window.dispatchEvent` custom events (`'pandalSelected'`) to avoid prop-drilling.

## Core Data Model
**`Pandal` type:**
```ts
type Pandal = {
  id: string;
  name: string; name_lowercase: string;
  name_bengali: string; name_bengali_lowercase: string;
  latitude: number; longitude: number;
  type: "popular" | "regular" | "metro";
  zone: "North" | "South" | "Central" | null;
  bonedi: boolean;
};
```
*Note: `type = "metro"` exists in the `Metro` collection. Filter logic ensures metro stations are mutually exclusive with standard pandals.*

## Environment Variables
- **Client (`.env.local`):** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_GA_ID`
- **Server (`.env`):** `GOOGLE_API_KEY` (Genkit)

## Important Caveats for Agents
1. **ISR Caching:** Avoid spamming Firestore. `getPandals()` relies on `React.cache()` request deduplication and page-level `revalidate = 600`.
2. **shadcn/ui:** Components in `src/components/ui/` are generated. Do not manually edit them unless absolutely necessary. Add new ones via `npx shadcn@latest add <name>`.
3. **Strict Build Ignores:** `next.config.ts` ignores TS/ESLint errors on build. Manually run `npm run typecheck` to verify code integrity.
4. **Offline/Location Denied:** If GPS is denied, the map gracefully defaults to Kolkata (`22.5726, 88.3639`). Always handle `location.status === 'success'` securely.
