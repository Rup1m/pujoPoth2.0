<!--
Purpose: concise instructions for AI coding agents (Copilot / coding assistants).
Aim for brevity (around 20-50 lines) but include the essential file references
and a short checklist of authoritative rules. Reference concrete files and
patterns only.
-->
# Copilot / Coding Agent Instructions — PujoPoth

This repository is a Next.js 15 app (frontend + server-rendered pages) that uses
Firebase (client & admin SDKs) for data and GenKit for AI flows. Use the
concrete files below to understand patterns and make safe edits.

Primary checklist (follow in order):
1) Firestore access must live in `src/services/pandalService.ts`.
2) Preserve two-layer caching: use `React.cache()` in service functions and
   retain Next.js ISR revalidation in pages.
3) Use UI primitives from `src/components/ui/` for common UI atoms.
4) Import `ai` from `src/ai/genkit.ts`; do not hard-code model names.

Quick architecture and why:
- Next.js (app/ directory): UI and server-rendered pages. See `src/app/page.tsx`
  for the landing flow and `src/app/app` for the authenticated app shell.
- Data layer: Firestore is the primary source. Access helpers live in
  `src/services/pandalService.ts` (uses `React.cache()` + ISR revalidate via
  pages). All Firestore access code must be implemented in
  `src/services/pandalService.ts`. Other files should import functions from
  that module; do not instantiate Firestore or call `db` directly elsewhere
  unless you include a PR note explaining and authorizing the exception.
- Auth: Firebase Auth is initialized in `src/lib/firebase-config.ts`. Client
  hooks like `src/hooks/use-auth.ts` are the single source of truth for sign-in
  state.
- AI: GenKit is configured in `src/ai/genkit.ts` and flows register side-effects
  in `src/ai/dev.ts` (imports `src/ai/flows/*`). Edit flows when adding new AI
  interactions or when fixing bugs/refactoring existing flows. For local
  testing use `npm run genkit:dev` or `npm run genkit:watch`.
  If GenKit/AI keys are missing, dev scripts should exit with a clear error:
  "Missing AI keys: set <ENV_NAMES> or run with MOCK_EXTERNALS=true to use
  local mocks." Use `npm run genkit:dev -- --verbose` for debugging logs.

Developer workflows (commands from `package.json`):
- Start dev server (Next.js + turbopack) on port 9002:
  - npm run dev
- GenKit local flow runner:
  - npm run genkit:dev
  - npm run genkit:watch (live reload)
- Build for production:
  - npm run build && npm run start
- Seed Firestore locally (scripts/seed.ts):
  - npm run db:seed

Required dev environment: Node.js >= 18.x, npm >= 9.x. Use an `.nvmrc` or
`package.json` engines to pin versions in CI.

Project-specific conventions and patterns:
- Two-layer caching for data: `React.cache()` in service functions + Next.js ISR
  revalidation in pages (preserve both when modifying server-side
  data-fetching).
- Environment variables: public Firebase keys are read from
  `NEXT_PUBLIC_*` variables in `src/lib/firebase-config.ts`. Do not commit
  secrets. If secrets are unavailable (CI or local), set `MOCK_EXTERNALS=true`
  to run flows against local mocks/emulators. In CI, fail fast with a clear
  error listing missing secrets and instructions to provide them via secure
  CI env vars or enable `MOCK_EXTERNALS` for local runs.
- Routing and auth: Landing redirects to `/app` after auth using a single
  post-auth source of truth in `src/app/page.tsx` (look for the `useEffect`
  that reads `user` from `use-auth`). Avoid duplicating navigation logic.
- UI primitives: Components under `src/components/ui/` are design-system atoms
  (buttons, inputs, dialogs). Prefer using these for consistent styling.

Integration points & external deps to be careful with:
- Firebase (client + admin) — `firebase` and `firebase-admin` in package.json.
  When writing or running tests that read/write Firestore, use the Firebase
  Emulator Suite and seed data (`npm run db:seed`) or mock the `db` helpers.
  Example: set `FIREBASE_EMULATOR_HOST` and run tests against the emulator;
  do not run tests against production Firestore. PRs with tests touching
  Firestore must include `FIREBASE_EMULATOR_HOST` in their test job config.
- Google AI via GenKit — `src/ai/genkit.ts` sets the model and plugin. Don't
  hard-code model names elsewhere; import `ai` from this file. Ensure flows
  gracefully handle missing keys (see note above).

Editing guidance examples:
- To add a new data query: add a function to `src/services/pandalService.ts` and
  reuse `db` from `src/lib/firebase-config.ts`. Follow the try/catch and
  logging style already present.
- To add a new AI flow: add a file under `src/ai/flows/` and ensure `src/ai/dev.ts`
  imports it (flows are imported for side effects). Use `genkit` via the
  exported `ai` from `src/ai/genkit.ts`.

When unsure, read these files first: `package.json`, `next.config.ts`,
`src/lib/firebase-config.ts`, `src/services/pandalService.ts`, `src/ai/genkit.ts`,
`src/app/page.tsx`.

If you modify server-side code, run `npm run build` and fix type errors via
`npm run typecheck`. Lint with `npm run lint`.

Ask the repo owner for missing secrets (Firebase service account or NEXT_PUBLIC
keys) before running flows that hit external APIs. For CI/local fallbacks and
emulator guidance see the checklist and notes above.

---
If any section is unclear or you need examples for a specific change (UI,
database, AI flow), tell me which area and I will expand with concrete file
snippets and tests to validate the change.