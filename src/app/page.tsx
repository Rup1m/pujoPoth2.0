"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function LandingPage() {
  const { user, loading, signIn, initializeOneTap } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Stash a pending pandal deep-link ID so it survives the sign-in redirect.
  useEffect(() => {
    const pendingPandal = searchParams.get("pandal");
    if (pendingPandal) {
      localStorage.setItem("pendingPandalId", pendingPandal);
    }
  }, [searchParams]);

  // Redirect authenticated users straight to /app.
  // This fires both on initial load (returning user) AND after a fresh sign-in
  // because onAuthStateChanged sets `user`, which triggers this effect.
  // This is the SINGLE source of truth for post-auth navigation — no router
  // call inside handleExplore, which eliminates the race condition.
  useEffect(() => {
    if (!loading && user) {
      const pendingId = localStorage.getItem("pendingPandalId");
      localStorage.removeItem("pendingPandalId");
      if (pendingId) {
        router.replace(`/app?pandal=${pendingId}`);
      } else {
        router.replace("/app");
      }
    }
  }, [loading, user, router]);

  // ── Initialize Google One-Tap on mount ─────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) {
      initializeOneTap();
    }
  }, [loading, user, initializeOneTap]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading || user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-48 rounded-lg" />
      </div>
    );
  }

  // ── CTA handler (fallback if One-Tap was dismissed) ────────────────────────
  const handleSignIn = async () => {
    // Try re-triggering One-Tap first
    initializeOneTap();

    // If One-Tap is unavailable (e.g. no client ID), fall back to popup
    const result = await signIn();

    // Only toast on actual errors — not on user cancelling the popup
    if (result.error) {
      toast({
        title: "Sign in failed",
        description: result.error.startsWith("auth/")
          ? "Please check your internet connection and try again."
          : "Please try again.",
        variant: "destructive",
      });
    }
  };

  // ── Unauthenticated — landing page ─────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ─── Hero Section ─── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-10 text-center">
        {/* Brand */}
        <h1 className="text-5xl leading-tight mb-4">
          <span className="font-calligraphy">Pujo</span>
          <span className="font-extrabold">পথ</span>
        </h1>

        {/* Tagline */}
        <p className="text-lg font-bold text-accent mb-2">
          Kolkata&apos;s smartest pandal guide
        </p>

        {/* Subtext */}
        <p className="text-sm text-muted-foreground max-w-xs mb-8 leading-relaxed">
          95+ pandals. Real-time directions. Works right from your phone.
        </p>

        {/* CTA */}
        <button
          onClick={handleSignIn}
          className="block w-full max-w-xs rounded-lg bg-primary text-primary-foreground text-center font-bold text-lg py-4 px-6 active:scale-95 transition-transform"
        >
          Sign in with Google
        </button>
      </section>

      {/* ─── Social Proof ─── */}
      <section className="px-6 py-8">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-extrabold text-primary">1,080+</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              Puja explorers last season
            </p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-primary">95+</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              Pandals &amp; Bonedi Bari Pujos
            </p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-primary">70K</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              Instagram video views
            </p>
          </div>
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="mx-6 border-t border-border" />

      {/* ─── Feature Highlights ─── */}
      <section className="px-6 py-8 flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-bold text-base text-accent mb-1">
            Find Pandals Near You
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Live location. Nearest pandals instantly.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-bold text-base text-accent mb-1">
            Smart Filters
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            North, South, Central, Bonedi Bari. Find what you want.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-bold text-base text-accent mb-1">
            Directions Built In
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Walking time, driving time, metro — all in one tap.
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 py-8 text-center text-xs text-muted-foreground border-t border-border mt-auto">
        <p className="font-bold">A Rupam Banerjee Production</p>
        <p className="mt-1">rupamiem@gmail.com</p>
        <p className="mt-1">&copy; 2026</p>
      </footer>
    </main>
  );
}
