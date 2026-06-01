# Authentication Fix: User Account Creation & Best Practices

## Problem
Users were being redirected to the landing page after signing in, with no account being created in Firestore. This prevented:
- Marking visited pandals
- Profile data persistence
- Gamification achievements tracking

## Root Cause
When users authenticated with Google via Firebase Auth, only an Auth record was created—not a corresponding Firestore user document. Subsequent operations that required user data failed silently or with permission errors (Firestore rules prevent access to `/users/{uid}` without a parent document).

## Solution: Automatic User Profile Initialization

### 1. New `userService.ts`
**File:** `src/services/userService.ts`

Handles user profile creation and management:
- `ensureUserExists(firebaseUser)` — Creates user document on first sign-in
  - Checks if user already exists
  - Creates full profile on first sign-in with metadata (email, displayName, createdAt)
  - Updates `lastSignIn` on returning visits
  - Handles edge cases gracefully
  
- `getUserProfile(uid)` — Retrieves user profile
- `updateUserProfile(uid, updates)` — Updates user data

### 2. Enhanced `use-auth.ts` Hook
**Key Changes:**

```typescript
// Automatically create user profile after auth succeeds
if (firebaseUser) {
  // Retry logic: 3 attempts with 2s intervals
  // Automatic recovery for transient network/permission errors
  ensureUserExists(firebaseUser).catch(...)
}
```

**Retry Mechanism:**
- Attempts up to 3 times if user initialization fails
- 2-second interval between retries
- Non-blocking: User is set immediately while profile initializes in parallel
- Fallback: Errors logged but don't prevent app access

### 3. Extended Hydration Delay
**File:** `src/app/app/auth-gated-app.tsx`

Increased from 1500ms to 2000ms to account for:
- User profile initialization time
- Firestore write latency
- Device/network variability

### 4. Improved Error Handling
**Files Modified:**
- `visitedPandalsService.ts` — Added error handling for missing user data
  - `getVisitedPandals()` returns empty array on error (doesn't crash)
  - `getVisitedPandalDetails()` returns empty array on error
  - Input validation on all functions

### 5. Firestore Security Rules
**Confirmed:** Existing rules already support user-initiated account creation
```firestore
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## Authentication Flow (Updated)

```
User clicks "Sign in" → Google OAuth redirect
     ↓
Firebase Auth creates/updates auth record
     ↓
onAuthStateChanged fires with authenticated user
     ↓
NEW: ensureUserExists() creates Firestore user document
     ↓
App waits 2s (hydration delay) for all operations to complete
     ↓
Landing page useEffect detects user → redirects to /app
```

## Best Practices Implemented

### 1. Separation of Concerns
- Auth state (Firebase Auth) ≠ User data (Firestore)
- Dedicated `userService.ts` for profile management
- Hooks focus on state, not data operations

### 2. Non-Blocking Operations
- User profile initialization doesn't block sign-in
- Errors don't prevent app access
- Failed retry attempts logged for debugging

### 3. Idempotent Operations
- `ensureUserExists` is safe to call multiple times
- Uses Firestore `setDoc(..., {merge: true})` for updates
- Prevents data loss on retry

### 4. Proper Error Boundaries
- Each Firestore operation wrapped in try/catch
- Graceful degradation (empty arrays instead of crashes)
- Detailed console logging for debugging

### 5. Generous Timeouts
- 2-second hydration delay (vs original 1500ms)
- 2-second retry interval (3 attempts max)
- Accounts for slow networks and devices

## Testing Checklist

- [ ] **First Sign-in**
  - Sign in with Google on clean device/private browsing
  - Check Firestore console: user document created in `/users/{uid}`
  - Check that `createdAt` is populated
  - App should redirect to `/app` within ~2 seconds

- [ ] **Returning Sign-in**
  - Sign out
  - Sign in again with same account
  - Check Firestore: `lastSignIn` updated (other fields unchanged)
  - App should redirect to `/app` within ~2 seconds

- [ ] **Visited Pandals**
  - After sign-in, click on pandal
  - Mark as visited
  - Verify: `/users/{uid}/visitedPandals/{pandalId}` created
  - Toggle unvisit — document should be deleted

- [ ] **Slow Network**
  - Throttle network to "Slow 4G" in DevTools
  - Sign in — app should still work (2s delay may extend)
  - Visited pandals should sync

- [ ] **Error Recovery**
  - Simulate offline (DevTools network tab → offline)
  - Sign in (Firebase auth works, user doc creation fails)
  - Go online
  - Wait 2-4 seconds — user doc should be created via retry
  - Visited pandals should work

- [ ] **Profile Sheet**
  - Open profile sheet after sign-in
  - Verify user data loads correctly
  - Check achievement badges display

## Future Enhancements

### 1. Cloud Function for Backup
Consider adding a Cloud Function to auto-create user on Auth event:
```typescript
// functions/onCreate.ts
export const createUserDocument = onAuthStateChanged((user) => {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  setDoc(userRef, {...}, {merge: true});
});
```

### 2. Server-Side User Validation
Add `/api/user/validate` endpoint to verify user exists before app loads.

### 3. Custom Claims
Use Firebase custom claims to track user onboarding state:
- `hasCompletedProfile`
- `emailVerified`
- `languagePreference`

## Deployment Notes

1. **No database migrations required** — Firestore is schema-less
2. **Security rules don't need updating** — Already support user collections
3. **Backward compatible** — Existing users unaffected
4. **Environment variables** — No new env vars required

## Debugging

### Check Console
```
[useAuth] Auth state resolved: user@example.com
[useAuth] User profile initialized successfully: user@example.com
```

### Check Firestore
Navigate to Firestore console → `users` collection → Look for user UID → Should contain:
```json
{
  "uid": "...",
  "email": "user@example.com",
  "displayName": "User Name",
  "photoURL": "https://...",
  "createdAt": "2026-06-01T10:30:00Z",
  "lastSignIn": "2026-06-01T10:30:00Z"
}
```

### Common Issues

**User redirected to landing page immediately after sign-in:**
- Check Firestore rules — must allow `request.auth.uid == userId`
- Check console for ensureUserExists errors
- Increase hydration delay to 3000ms for testing

**Visited pandals not persisting:**
- Verify user document exists in Firestore
- Check `/users/{uid}/visitedPandals` collection
- Check browser console for setDoc errors

**Sign-in takes >3 seconds:**
- Normal on slow networks (1500-2000ms is expected)
- Check DevTools network tab for slow requests
- Verify Firebase credentials are valid

## Files Modified

1. `src/services/userService.ts` — NEW
2. `src/hooks/use-auth.ts` — Updated with retry logic
3. `src/app/app/auth-gated-app.tsx` — Extended hydration delay
4. `src/services/visitedPandalsService.ts` — Better error handling
