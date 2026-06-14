# PujoPoth (পুজোপথ) — Project Context

> **Durga Puja pandal navigator for Kolkata.** Full-screen Google Map with pandal/metro markers, search, filtering, directions, bilingual UI (English/Bengali), gamified pandal tracker, and Firebase backend.

## 🌟 Current Features (Implemented)
- **Interactive Map Engine:** Full-screen Google Map (`@vis.gl/react-google-maps`) with custom SVG markers for 95 pandals and metro stations.
- **Discovery & Search:** Autocomplete search bar, and bottom-sheet filters (Zone: North/South/Central, Heritage: Bonedi, Metro).
- **Navigation & AI:** Real-time geolocation (`useLocation`) and Server-side Genkit AI flows (`get-directions-flow`) for walking/driving/transit times.
- **Bilingual Interface:** English & Bengali (`LanguageContext`, `locales.ts`), persisted via `localStorage` with a first-run onboarding screen.
- **UI/UX:** Responsive bottom sheets (`shadcn/ui`), floating action buttons, animated splash screen (`framer-motion`/Tailwind), and dynamic Pandal Hub cards.
- **Backend Infrastructure:** Firebase Firestore database (read-only client access), `React.cache()` with Next.js ISR (600s), hosted on Firebase App Hosting.
- **User Authentication (Firebase Auth):**
  - Google Sign-In via Google Identity Services (One Tap + branded button) with popup fallback.
  - Auth gate: unauthenticated users see `AuthScreen`, authenticated users bypass to the map.
  - Sign Out button inside the Account panel. `AuthProvider` context manages all auth state.
  - Firestore security rules enforce user-specific read/write on `users/{uid}`.
- **Gamified User Account Section (Dashboard):**
  - **Visited Tracker:** Users mark pandals as visited via a toggle button on the PandalHub card. Optimistic localStorage update + background Firestore sync (`visitedPandalsService.ts`).
  - **SVG Progress Ring:** Animated circular progress ring (128px) showing `visited/95` count with percentage. Animates on panel open via `stroke-dashoffset` transition. Glows when ≥50%.
  - **Zone Mastery:** Per-zone (North/South/Central) progress bars dynamically calculated from `allPandals` array. Shows `visited/total` per zone.
  - **8 Achievement Tiers:** First Darshan (1) → Pandal Curious (5) → Pujo Explorer (10) → Pandal Enthusiast (20) → Pandal Hopper (35) → Half Century (50) → Pujo Veteran (75) → Pujo Champion (95). Each with bilingual titles, descriptions, and emojis.
  - **Achievement Badges UI:** Earned badges show shimmer effect + star. Locked badges show lock icon + dashed border + progress bar toward threshold. Newest earned badge pulses with glow animation.
  - **Confetti Celebration:** Pure-CSS confetti burst (24 particles, Durga Puja festive palette) fires when a new achievement tier is unlocked by marking a pandal.
  - **Smart Toasts:** Marking visited shows `"Marked as visited ✓ · pandal name · 37/95"`. Achievement unlock shows `"🏵️ Achievement Unlocked: Pujo Explorer!"`.
  - **Important Constraint:** All calculations strictly out of **95 pandals**. Metro stations are NEVER counted (`type === "metro"` filtered out at every layer).
  - **Analytics:** Tracks `pandal_visited`, `pandal_unvisited`, `achievement_unlocked`, `account_panel_opened` events via GA4.

## 🚀 Upcoming Features (Final Product Launch)
*Critical requirements for the next phase of development:*

1. **Visited Pandals List (Accessible from Dashboard):**
   - Users can currently see *how many* pandals they've visited (progress ring shows `37/95`), but they **cannot see *which* pandals** they've visited by name.
   - Add a tappable/expandable section in the `UserAccountPanel` dashboard that reveals the full list of visited pandal names.
   - **Design Principles:** Must not clutter the existing dashboard. Should feel like a natural extension — think Instagram's "Saved" collections or Pinterest's boards. Collapsible/expandable pattern so it doesn't overwhelm the progress ring and achievements on first glance.
   - **UX Requirements:** Each visited pandal in the list should be tappable → navigates the map to that pandal and opens its PandalHub card. This creates a "revisit" loop that drives re-engagement. Show zone badge (North/South/Central) next to each name for quick scanning.
   - **Important:** List must exclude metro stations. Sort by zone grouping or alphabetical for scannability.

2. **"Visited" Filter on the Map:**
   - Add a new filter option alongside the existing North/South/Central/Bonedi/Metro filters in the `FilterPanel`.
   - When the **"Visited"** filter is active, the map displays **only** the pandals the user has marked as visited.
   - This lets users see their personal "conquest map" — a powerful visual reward that creates a sense of completion and pride.
   - **Technical:** The `getFilteredPandals()` service function and `Filters` type need to be extended with a `visited: boolean` field. The filter must cross-reference `visitedIds` against the pandal list.
   - **UX:** The filter chip should feel distinct from zone filters — use a checkmark icon or visited-specific color to signal it's a personal filter, not a geographic one.

3. **Vibrant Visited Marker Visuals on the Map:**
   - Visited pandals must be **visually distinct** on the map from unvisited ones — creating a "coloring book" effect where users feel the map "filling up" as they visit more pandals.
   - **Design Vision:** Unvisited pandals keep the current marker style. Visited pandals get a distinct visual treatment (e.g., glowing border, checkmark overlay, different marker color, or a subtle "completed" badge).
   - **Psychology:** This taps into the **Zeigarnik Effect** (people remember uncompleted tasks) and **collection completionism** (Pokédex / stamp-collecting dopamine). Seeing a half-colored map creates urgency to "finish the set."
   - **Performance:** Marker visual changes must be lightweight. Use SVG class toggling, not re-renders. The `visitedIds` set is already passed to `MapContainer` — extend `PandalMarker` to accept visited state.
   - **Important:** Metro station markers must NEVER show visited state, regardless of any edge case.

4. **Advanced Google Analytics (GA4):** 
   - Expand current base GA implementation to fetch and analyze user engagement data.
   - Track key product success metrics: Time spent in app, specific feature usage, user retention, and gamification engagement.

## Quick Reference
| Item | Value |
|---|---|
| **Framework** | Next.js 15.3.3 (App Router, RSC, Turbopack) | 
| **Language** | TypeScript 5, React 18 |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui |
| **Database** | Cloud Firestore (`pandals`, `Metro`, `users` collections) |
| **AI** | Genkit 1.14 + Google AI (`gemini-2.5-flash`) |
| **Hosting** | Firebase App Hosting |

## Architecture & Data Flow
- **`app/page.tsx`**: Landing page. Links to `/app` which holds the map.
- **`components/pujo-map.tsx`**: Central Client Orchestrator. Wires hooks, state, and map primitives. Gates: Splash → Language → Auth → Map.
- **`src/ai/flows/`**: Server Actions. `getDirections()` queries Google Directions API safely.
- **Event Bus Pattern**: Sibling components (e.g., `PandalSearch` → `MapCore`) communicate via `window.dispatchEvent` custom events (`'pandalSelected'`) to avoid prop-drilling.

### Gamification Data Flow
- **`services/visitedPandalsService.ts`**: Persistence layer. Write: localStorage (instant) → Firestore (background). Read: localStorage on mount → Firestore merge on auth.
- **`hooks/use-visited-pandals.ts`**: React hook. Reads localStorage sync on mount, merges with Firestore when auth resolves, exposes `toggleVisited()` with optimistic updates.
- **`hooks/use-pandal-tracker.tsx`**: Derives gamification state (`TrackerState`) from visited IDs: progress %, earned achievements, zone mastery, next tier info.
- **`components/user-account-panel.tsx`**: Dashboard UI. Progress ring, zone bars, achievement badges, sign-out. Opened via avatar FAB in `MapControls`.
- **`components/pandal-hub.tsx`**: PandalHub card. "Mark as Visited" toggle with bounce animation, achievement detection, confetti burst, and smart toasts.
- **`components/confetti-burst.tsx`**: Pure-CSS confetti (24 particles, no dependencies). Auto-cleans after 1.6s.

### Firestore Schema
```
pandals/{pandalId}    → Pandal data (read-only)
Metro/{metroId}       → Metro station data (read-only)
users/{uid}           → { visitedPandals: string[], titles: string[] } (user-specific read/write)
```

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

**`TrackerState` type (gamification):**
```ts
type TrackerState = {
  visitedCount: number;
  progressPercent: number;       // 0-100
  currentTitle: Achievement | null;
  nextTitle: Achievement | null;
  earnedAchievements: Achievement[];
  pandalsToNextTier: number;
  zoneMastery: ZoneMastery[];    // { zone, visited, total, percent }[]
};
```

## Environment Variables
- **Client (`.env.local`):** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- **Server (`.env`):** `GOOGLE_API_KEY` (Genkit)

## Important Caveats for Agents
1. **ISR Caching:** Avoid spamming Firestore. `getPandals()` relies on `React.cache()` request deduplication and page-level `revalidate = 600`.
2. **shadcn/ui:** Components in `src/components/ui/` are generated. Do not manually edit them unless absolutely necessary. Add new ones via `npx shadcn@latest add <name>`.
3. **Strict Build Ignores:** `next.config.ts` ignores TS/ESLint errors on build. Manually run `npm run typecheck` to verify code integrity.
4. **Offline/Location Denied:** If GPS is denied, the map gracefully defaults to Kolkata (`22.5726, 88.3639`). Always handle `location.status === 'success'` securely.
5. **Visited Pandals — Metro Exclusion:** Metro stations (`type === "metro"`) must NEVER be counted in the visited tracker. This is enforced at three layers: `visitedPandalsService.ts` (write guard), `use-pandal-tracker.tsx` (filter), and `pandal-hub.tsx` (UI guard).
6. **Optimistic UI Pattern:** Visited pandal toggles update localStorage and React state immediately. Firestore sync happens in background (fire-and-forget). UI never waits for Firestore.
7. **Gamification Animations:** All CSS animations (shimmer, confetti, scale-bounce, ring-fill, pulse-glow) are defined in `globals.css` and registered in `tailwind.config.ts`. They use GPU-accelerated `transform`/`opacity` for 60fps. No external animation libraries.
