"use client";

import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, WifiOff, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

// ── Google "G" logo (official colors, inline SVG) ────────────────────────────

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function AuthScreen() {
  const { signInWithGoogle, authError, isSigningIn, isRedirectPending, clearError } = useAuth();
  const { text } = useLanguage();
  const [isOffline, setIsOffline] = useState(false);

  // ── Offline detection ───────────────────────────────────────────────────

  useEffect(() => {
    // Initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ── Determine button state & text ──────────────────────────────────────

  const isDisabled = isSigningIn || isRedirectPending || isOffline;

  const getButtonContent = () => {
    if (isRedirectPending) {
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{text.completingSignIn}</span>
        </>
      );
    }
    if (isSigningIn) {
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{text.signingIn}</span>
        </>
      );
    }
    return (
      <>
        <GoogleLogo className="w-5 h-5" />
        <span>{text.signInWithGoogle}</span>
      </>
    );
  };

  // ── Map auth error category to localized message ───────────────────────

  const getErrorMessage = (): string | null => {
    if (!authError) return null;

    switch (authError.category) {
      case "Network":
        return text.authErrorNetwork;
      case "TooManyRequests":
        return text.authErrorTooManyRequests;
      case "AccountDisabled":
        return text.authErrorAccountDisabled;
      case "PopupBlocked":
        return text.authErrorPopupBlocked;
      case "Generic":
      default:
        return text.authErrorGeneric;
    }
  };

  const errorMessage = getErrorMessage();

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleSignIn = async () => {
    clearError();
    await signInWithGoogle();
  };

  const handleRetry = () => {
    clearError();
    handleSignIn();
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background p-4 animate-fade-in">
      {/* ── Offline banner ── */}
      {isOffline && (
        <div
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-500/95 text-white px-4 py-2.5 text-sm font-semibold backdrop-blur-sm animate-fade-in-up"
          role="alert"
        >
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>{text.offlineMessage}</span>
        </div>
      )}

      {/* ── Brand ── */}
      <div className="mb-8 text-center animate-smooth-reveal">
        <h1 className="font-calligraphy text-5xl text-primary drop-shadow-sm md:text-6xl">
          Pujo<span className="text-foreground">পথ</span>
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground md:text-base">
          {text.tagline}
        </p>
      </div>

      {/* ── Auth card ── */}
      <Card className="w-full max-w-sm shadow-xl animate-fade-in-up border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline text-accent">
            {text.authWelcome}
          </CardTitle>
          <CardDescription>
            {text.authSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* ── Sign-in button ── */}
          <Button
            id="auth-sign-in-button"
            size="lg"
            className="w-full text-md font-bold shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2.5"
            onClick={handleSignIn}
            disabled={isDisabled}
          >
            {getButtonContent()}
          </Button>

          {/* ── Error message with retry ── */}
          {errorMessage && (
            <div
              className="flex flex-col items-center gap-2 animate-fade-in"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm text-destructive text-center">
                {errorMessage}
              </p>
              <Button
                id="auth-retry-button"
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1.5"
                onClick={handleRetry}
                disabled={isSigningIn || isOffline}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {text.retry}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
