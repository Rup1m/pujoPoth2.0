import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Lazy-initialize Firebase so that importing this module never triggers
 * `initializeApp()` at the top level.  During Vercel builds the
 * NEXT_PUBLIC_FIREBASE_* env vars are absent, which causes
 * `auth/invalid-api-key` if initialization happens at import time.
 *
 * Consumers call `getDb()` and `getFirebaseAuth()` to obtain the real
 * Firebase instances — these are only constructed on first access at
 * request time, never during the static-analysis build phase.
 */

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
    if (!_app) {
        _app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    }
    return _app;
}

/** Firestore instance — safe to call at request time. */
function getDb(): Firestore {
    if (!_db) {
        _db = getFirestore(getFirebaseApp());
    }
    return _db;
}

/** Auth instance — safe to call at request time. */
function getFirebaseAuth(): Auth {
    if (!_auth) {
        _auth = getAuth(getFirebaseApp());

        // Configure auth persistence — must run client-side only
        if (typeof window !== 'undefined') {
            import('firebase/auth').then(({ setPersistence, indexedDBLocalPersistence, browserLocalPersistence }) => {
                setPersistence(_auth!, indexedDBLocalPersistence).catch(() => {
                    // IndexedDB unavailable (e.g. iOS Safari private mode) — fall back to localStorage
                    setPersistence(_auth!, browserLocalPersistence).catch(() => {
                        // Both failed — session will still work, just won't persist across tabs
                        console.warn('[Auth] Could not set persistence. Session may not persist.');
                    });
                });
            });
        }
    }
    return _auth;
}

export { getDb as db, getFirebaseAuth as auth, getFirebaseApp as app };


