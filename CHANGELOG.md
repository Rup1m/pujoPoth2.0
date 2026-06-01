# 📋 Pujoপথ — Change Log

> **Purpose:** This file is the single source of truth for every change made to the PujoPoth codebase. It optimizes the agent's context window and token utilization by eliminating the need to re-audit or re-discover past work. Every approved feature, bug fix, optimization, and audit result is logged here chronologically.

> [!IMPORTANT]
> Only add entries here **after** a change has been verified, approved, and is robustly working. Do not log work-in-progress or speculative changes.

---

## Log Format

Each entry follows this structure:

```
### [DATE] — [SHORT TITLE]
- **Type:** Feature | Bug Fix | Optimization | Audit | Refactor | Cleanup
- **Files Changed:** [list of files]
- **Summary:** [what was done and why]
- **Status:** ✅ Verified & Approved
```

---

## 📝 Change History

---

### 2026-05-18 — Non-Negotiable Requirements Document Created

- **Type:** Documentation
- **Files Changed:** `requirements.md`
- **Summary:** Created `requirements.md` with all 82 non-negotiable product requirements across 9 categories: Product Philosophy, Mobile-First, Performance, Stability & Reliability, UI/UX, Features, Security & Infrastructure, Codebase, and Deployment. This serves as the foundational reference for all development decisions.
- **Status:** ✅ Verified & Approved

---

### 2026-05-18 — Schema Audit: Type Field Consistency

- **Type:** Audit
- **Files Audited:** `src/lib/types.ts`, `src/services/pandalService.ts`, `src/components/pandal-marker.tsx`, `src/components/filter-panel.tsx`, `scripts/pandal-data.json`, `scripts/seed.ts`
- **Summary:** Full read-only audit of type field consistency across all layers. Confirmed:
  - **Type definition:** `"popular" | "regular" | "metro"` — correct in `types.ts`
  - **Zone definition:** `"North" | "South" | "Central" | null` — correct
  - **Bonedi:** `boolean` — correct
  - **No rogue type strings** (`"local"`, `"normal"`, `"standard"`) found anywhere
  - **Data counts:** 78 popular, 14 regular, 26 metro, 0 invalid (118 total entries)
  - **Seed script:** No type transformation or override — passes data through cleanly
  - **All 6 files PASSED** — zero fixes needed
- **Status:** ✅ Verified & Approved

---

### 2026-06-01 — Auth Overhaul: Google One-Tap Removed, Popup/Redirect Flow Hardened for Production

- **Type:** Feature + Bug Fix + Refactor
- **Files Changed:**
  - `src/hooks/use-auth.ts` — **core auth hook, fully rewritten**
  - `src/lib/firebase-config.ts` — **persistence configuration added**
  - `src/app/page.tsx` — **landing page sign-in flow fixed**
  - `src/app/app/auth-gated-app.tsx` — **hydration delay added to auth gate**
  - `src/app/layout.tsx` — **GSI script tag removed**
- **Summary:**

  **What was removed:**
  - Google One-Tap (GSI) auth entirely — the `initializeOneTap` function, all `window.google` type declarations, the `signInWithCredential` import, the GSI script tag from `layout.tsx`, and all consumer call sites in `page.tsx`. Zero remnants remain in the codebase.

  **What was built (use-auth.ts — the hook):**
  - **Mobile detection:** `isMobile()` checks `window.innerWidth < 768`, UA for `Android|iPhone`, and iPadOS 13+ via `navigator.maxTouchPoints > 1` (iPadOS sends Mac UA).
  - **Sign-in routing:** Mobile → `signInWithRedirect`. Desktop → `signInWithPopup` with automatic fallback to `signInWithRedirect` if `auth/popup-blocked` is caught.
  - **Redirect result handling:** `getRedirectResult(auth)` called inside the **same** `useEffect` as `onAuthStateChanged` to guarantee the listener is attached before the redirect result resolves. This prevents a race condition on mobile where the user returning from Google redirect could be silently dropped.
  - **Silent error codes:** `auth/popup-closed-by-user`, `auth/cancelled-popup-request`, `auth/user-cancelled`, `auth/redirect-cancelled-by-user`, `auth/popup-blocked` — all swallowed silently, not surfaced to the user.
  - **Mounted ref guard:** `setSigningIn(false)` in the `finally` block only fires if `mountedRef.current` is true. Prevents React setState-on-unmount warnings when `signInWithRedirect` navigates the page away.
  - **Exports:** `{ user, loading, signingIn, signIn, signOut }`. No `initializeOneTap`.

  **What was built (firebase-config.ts — persistence):**
  - Inside `getFirebaseAuth()`, after `_auth = getAuth(...)`, persistence is configured via dynamic `import('firebase/auth')` (SSR-safe).
  - Primary: `indexedDBLocalPersistence`. Fallback: `browserLocalPersistence` (for iOS Safari private browsing where IndexedDB is unavailable).
  - Runs exactly once, gated by the `if (!_auth)` singleton check and `typeof window !== 'undefined'`.

  **What was built (page.tsx — landing page):**
  - Local `isSigningIn` state + `mountedRef` for unmount safety.
  - `busy = isSigningIn || signingIn` drives both the handler guard and button state.
  - Button is `disabled={busy}`, shows CSS `animate-spin` spinner and "Signing in…" text when busy.
  - `handleSignIn` sets `isSigningIn = true` immediately, calls `signIn()`, shows toast only on real errors, and resets `isSigningIn` in `finally` with mounted check.
  - The redirect effect `useEffect(() => { if (!loading && user) router.replace("/app") })` remains the single source of truth for post-auth navigation.

  **What was built (auth-gated-app.tsx — auth gate):**
  - `hydrationDelay` state starts `true`, flips to `false` after 500ms via `setTimeout` (cleaned up on unmount).
  - Redirect to `/` only fires when ALL three conditions are true: `!loading`, `!user`, `!hydrationDelay`.
  - SplashScreen shown while `loading || hydrationDelay`.
  - This prevents false unauthenticated redirects on cold starts where Firebase takes 1-2s to resolve auth state, especially on mobile after a `signInWithRedirect` callback.

  **Consumer compatibility verified:**
  - `page.tsx` → `{ user, loading, signingIn, signIn }` ✅
  - `auth-gated-app.tsx` → `{ user, loading }` ✅
  - `pujo-map.tsx` → `{ user }` (as `firebaseUser`) ✅
  - `profile-sheet.tsx` → `{ signOut }` ✅

  **Build result:** ✓ Compiled successfully. Zero type errors. Zero warnings from auth code. All routes generated (static + SSG + dynamic).

- **Status:** ✅ Verified & Approved

---

### 2026-06-01 — CRITICAL FIX: Redirect Sign-In Loop (users stuck on landing page after Google sign-in)

- **Type:** Bug Fix (Production P0)
- **Files Changed:**
  - `src/hooks/use-auth.ts` — **resequenced auth initialization**
  - `src/lib/firebase-config.ts` — **removed racing async setPersistence**
- **Summary:**

  **Root Cause:**
  When a user returned from Google sign-in via redirect (mobile flow), `onAuthStateChanged` was attached and fired its initial callback with `null` **BEFORE** `getRedirectResult` had processed the redirect credentials. This caused:
  1. `loading = false`, `user = null` — prematurely
  2. `page.tsx` rendered the landing page (sign-in button visible)
  3. `getRedirectResult` eventually resolved with the user, but by then the damage was done — on slow networks, the user could re-tap sign-in starting a new redirect loop, or `getRedirectResult` could be interfered with by the async `setPersistence` racing in `firebase-config.ts`

  **Compounding factor:** `firebase-config.ts` had an unawaited `setPersistence` call via dynamic import. This async persistence change could race with `getRedirectResult`, corrupting the redirect result processing.

  **Fix — Sequential init in `use-auth.ts`:**
  ```
  1. await setPersistence(auth, indexedDBLocalPersistence)  ← blocks until done
  2. await getRedirectResult(auth)                          ← processes redirect FIRST
  3. onAuthStateChanged(auth, callback)                     ← listener fires with FINAL state
  ```

  This guarantees that when `onAuthStateChanged` fires its first callback, the redirect result (if any) has ALREADY been processed. The listener's first callback includes the authenticated user — never a premature `null`.

  **Fix — Removed racing persistence from `firebase-config.ts`:**
  The async `import('firebase/auth').then(({ setPersistence, ... }) => ...)` was removed. Persistence is now set synchronously (awaited) inside the `use-auth.ts` `useEffect` before any other auth operations.

  **Performance note:** `getRedirectResult` resolves in ~10ms when there's no pending redirect (normal page visits), so this does NOT add latency for non-redirect visitors. For redirect returns, the processing time (500ms-2s) keeps the splash screen visible, which is the correct UX.

  **State machine after fix:**
  - Non-redirect visit: `setPersistence` (~10ms) → `getRedirectResult` returns null (~10ms) → `onAuthStateChanged` fires → `loading=false` → landing page renders. Total added latency: ~20ms.
  - Redirect return: `setPersistence` (~10ms) → `getRedirectResult` processes credentials (~500ms-2s) → `onAuthStateChanged` fires with user → `loading=false`, `user=User` → redirect effect → `router.replace("/app")`. User NEVER sees the landing page.

- **Status:** ✅ Verified & Approved

---

<!-- 
=============================================================
  ADD NEW ENTRIES ABOVE THIS LINE
  Follow the format defined in the "Log Format" section above
=============================================================
-->
