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
 * By deferring to getter functions the SDK is only touched when
 * application code actually calls `getDb()` / `getAuth()` — i.e. at
 * request time in production, never during the static-analysis build phase.
 */

let _app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
    if (!_app) {
        _app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    }
    return _app;
}

/** Firestore instance — safe to call at request time. */
function getDb(): Firestore {
    return getFirestore(getFirebaseApp());
}

/** Auth instance — safe to call at request time. */
function getFirebaseAuth(): Auth {
    return getAuth(getFirebaseApp());
}

// Re-export under the same names so existing imports (`db`, `auth`) keep working.
// These are now getters on a module-level object, evaluated lazily on first access.
const db: Firestore = new Proxy({} as Firestore, {
    get(_target, prop, receiver) {
        return Reflect.get(getDb(), prop, receiver);
    },
});

const auth: Auth = new Proxy({} as Auth, {
    get(_target, prop, receiver) {
        return Reflect.get(getFirebaseAuth(), prop, receiver);
    },
});

export { db, auth };
export { getFirebaseApp as app };

