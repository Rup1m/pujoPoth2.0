# PujoPoth V2 — Master Reference

**Launch:** Oct 10, 2026 · **Stack:** Next.js 15 · TypeScript · Tailwind · Firestore · Vercel  
**V1:** 1,080 users · 30s avg session

---

## Bug Tracker

| # | Bug | Status |
|---|---|---|
| 1 | `pujo-map.tsx` monolith → split into hooks + components | ✅ Done |
| 2 | GA tracks nothing → event suite (`src/lib/analytics.ts`) | ✅ Done |
| 3 | Metro gate UX | 🚫 Shelved |
| 4 | `unstable_cache` → `React.cache()` + ISR `revalidate: 600` | ✅ Done |
| 5 | API key exposed → server-only key created | ✅ Done |
| 6 | Hardcoded 2.5s splash → animation-floor + data-readiness gate | ✅ Done |
| 7 | No auth/identity → Google One-Tap | ⬜ |

## V2 Features

| # | Feature | Status |
|---|---|---|
| 1 | Landing page (`/` → `/app`) | ⬜ |
| 2 | Google Auth + onboarding | ⬜ |
| 3 | Saved Pandals | ⬜ |
| 4 | Visited History | ⬜ |
| 5 | Full GA event tracking | ⬜ |

## Build Sequence

```
Step 1  ⬜ Fix DB schema ("regular" vs "local")
Step 2  ✅ Fix API key exposure
Step 3  ✅ Fix unstable_cache → React.cache() + ISR
Step 4  ✅ Split pujo-map.tsx monolith
Step 5  ⬜ Landing Page
Step 6  ⬜ Google Auth
Step 7  ⬜ Saved Pandals
Step 8  ⬜ Visited History
Step 9  ✅ GA event tracking (analytics.ts wired into 5 components)
Step 10 ✅ Splash screen fix (animation-floor gated)
Step 11 ⬜ Performance audit
Step 12 ⬜ Stress test
```

## ⚠️ Blocker

> Confirm Firestore `type` for non-popular pandals: `"local"` or `"regular"`? Gates Step 1.

## Do NOT Build

Crowd signals · Metro gates · Route planner · Pandal expansion

---