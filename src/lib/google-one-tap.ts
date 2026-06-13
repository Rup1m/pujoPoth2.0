/**
 * Google Identity Services (GIS) — One Tap & "Sign In With Google" button.
 *
 * This module wraps the `google.accounts.id` API so the rest of the app
 * doesn't need to touch the global directly.
 *
 * Docs: https://developers.google.com/identity/gsi/web/reference/js-reference
 */

// ── GIS type declarations ───────────────────────────────────────────────────

/** The credential response returned by GIS after a user selects an account. */
export interface GisCredentialResponse {
  /** JWT ID token containing the user's identity claims. */
  credential: string;
  /** How the credential was selected: "auto" | "user" | "user_1tap" | "user_2tap" | "btn" … */
  select_by: string;
  /** Client ID used for the request. */
  clientId?: string;
}

interface GisButtonConfiguration {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  /** Width in pixels. GIS only accepts numbers (min 200, max 400). */
  width?: number;
  locale?: string;
}

interface GisInitConfig {
  client_id: string;
  callback: (response: GisCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
  context?: "signin" | "signup" | "use";
}

/** Augment the global `window` with the GIS namespace. */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GisInitConfig) => void;
          prompt: (
            notification?: (n: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              isDismissedMoment: () => boolean;
              getNotDisplayedReason: () => string;
              getSkippedReason: () => string;
              getDismissedReason: () => string;
            }) => void
          ) => void;
          renderButton: (
            parent: HTMLElement,
            options: GisButtonConfiguration
          ) => void;
          disableAutoSelect: () => void;
          cancel: () => void;
          revoke: (
            hint: string,
            callback: (response: { successful: boolean; error?: string }) => void
          ) => void;
        };
      };
    };
  }
}

// ── Constants ───────────────────────────────────────────────────────────────

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

/** Maximum time (ms) to wait for the GIS script to load before giving up. */
const SCRIPT_LOAD_TIMEOUT_MS = 8_000;

/** Default button width in pixels (GIS requires a number, not a CSS string). */
const DEFAULT_BUTTON_WIDTH_PX = 360;

// ── Script loader ───────────────────────────────────────────────────────────

let _scriptLoaded = false;
let _scriptPromise: Promise<void> | null = null;

/**
 * Load the GIS client library with a timeout.
 * Resolves once `window.google.accounts.id` is available.
 * Rejects if the script fails to load or the timeout expires.
 *
 * A failed load resets the internal promise so the next call retries.
 */
export function loadGisScript(): Promise<void> {
  // Fast path: already loaded & global is available
  if (_scriptLoaded && window.google?.accounts?.id) {
    return Promise.resolve();
  }

  // Return the in-flight promise if one exists
  if (_scriptPromise) return _scriptPromise;

  _scriptPromise = new Promise<void>((resolve, reject) => {
    // Already available (e.g. loaded via <Script> in layout)
    if (window.google?.accounts?.id) {
      _scriptLoaded = true;
      resolve();
      return;
    }

    // ── Timeout guard ──────────────────────────────────────────────────
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(
        `Google Identity Services script did not load within ${SCRIPT_LOAD_TIMEOUT_MS / 1000}s. ` +
        "It may be blocked by an ad-blocker or network policy."
      ));
    }, SCRIPT_LOAD_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeoutId);
    };

    // ── Check for an existing <script> tag (from next/script) ──────────
    const existing = document.querySelector(
      `script[src="${GIS_SCRIPT_SRC}"]`
    ) as HTMLScriptElement | null;

    if (existing) {
      const onLoad = () => {
        cleanup();
        _scriptLoaded = true;
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Failed to load Google Identity Services script"));
      };
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      return;
    }

    // ── Create & append a new script tag ──────────────────────────────
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      cleanup();
      _scriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("Failed to load Google Identity Services script"));
    };
    document.head.appendChild(script);

  }).catch((err) => {
    // ── Reset the promise so the next call retries instead of
    //    returning the same rejected promise forever. ──────────────────
    _scriptPromise = null;
    _scriptLoaded = false;
    throw err;
  });

  return _scriptPromise;
}

// ── Initialization ──────────────────────────────────────────────────────────

let _initialized = false;
let _initializingPromise: Promise<void> | null = null;

/**
 * Initialize the GIS library. Must be called before `promptOneTap` or
 * `renderSignInButton`. Concurrent calls are de-duplicated.
 *
 * @param clientId  Google OAuth 2.0 client ID
 * @param callback  Called with the credential response when the user signs in
 * @param forceReinit  Pass `true` to re-initialize (e.g. after sign-out)
 */
export async function initializeGis(
  clientId: string,
  callback: (response: GisCredentialResponse) => void,
  forceReinit = false,
): Promise<void> {
  // Skip if already initialized (unless forced)
  if (_initialized && !forceReinit) return;

  // De-duplicate concurrent calls
  if (_initializingPromise && !forceReinit) return _initializingPromise;

  _initializingPromise = (async () => {
    await loadGisScript();

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback,
      auto_select: true,
      cancel_on_tap_outside: true,
      itp_support: true,
      use_fedcm_for_prompt: true,
      context: "signin",
    });

    _initialized = true;
  })();

  try {
    await _initializingPromise;
  } finally {
    _initializingPromise = null;
  }
}

/**
 * Whether GIS has been successfully loaded and initialized.
 * Use this to decide whether to show a fallback sign-in button.
 */
export function isGisAvailable(): boolean {
  return _initialized && !!window.google?.accounts?.id;
}

/** Reset the initialization flag. Call before re-initializing after sign-out. */
export function resetGisState(): void {
  _initialized = false;
}

// ── One Tap prompt ──────────────────────────────────────────────────────────

/**
 * Show the One Tap prompt (slides in from top-right on desktop,
 * bottom sheet on mobile). No-ops silently if GIS isn't initialized.
 *
 * @param onFallback  Optional callback invoked when One Tap can't display
 *                    (e.g. browser blocks it, cooldown period, user dismissed
 *                    recently — Google enforces a ~2 hr cooldown).
 */
export function promptOneTap(onFallback?: () => void): void {
  if (!_initialized || !window.google?.accounts?.id) return;

  window.google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      if (process.env.NODE_ENV === "development") {
        console.debug(
          "[GIS] One Tap not displayed:",
          notification.isNotDisplayed()
            ? notification.getNotDisplayedReason()
            : notification.getSkippedReason()
        );
      }
      onFallback?.();
    }
  });
}

// ── "Sign In With Google" button ────────────────────────────────────────────

/**
 * Render the official Google-branded sign-in button into `parentElement`.
 * The button automatically shows the user's profile picture if they have
 * an active Google session.
 *
 * Clears the container first to avoid duplicate buttons on re-render.
 */
export function renderSignInButton(
  parentElement: HTMLElement,
  options?: Partial<GisButtonConfiguration>
): void {
  if (!_initialized || !window.google?.accounts?.id) return;

  // Clear previous content to prevent duplicate buttons
  parentElement.innerHTML = "";

  // Compute width from the container, clamped to GIS limits (200–400px)
  const containerWidth = parentElement.offsetWidth || DEFAULT_BUTTON_WIDTH_PX;
  const width = Math.max(200, Math.min(400, containerWidth));

  window.google.accounts.id.renderButton(parentElement, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    logo_alignment: "left",
    width,
    ...options,
  });
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

/** Cancel any pending One Tap prompt. */
export function cancelOneTap(): void {
  if (window.google?.accounts?.id) {
    window.google.accounts.id.cancel();
  }
}

/**
 * Call after sign-out so `auto_select` doesn't immediately re-sign the
 * user in. Also resets the initialization flag so a fresh `initializeGis`
 * call works correctly for the next sign-in attempt.
 */
export function disableAutoSelect(): void {
  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
  resetGisState();
}
