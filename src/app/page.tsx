"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MapPin, ArrowRight } from "lucide-react";
import { siteStats } from "@/lib/site-config";

/**
 * Wrapper that provides the Suspense boundary required by useSearchParams()
 * during Next.js static page generation / prerendering.
 */
export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Skeleton className="h-12 w-48 rounded-lg" />
        </div>
      }
    >
      <LandingPageContent />
    </Suspense>
  );
}

function LandingPageContent() {
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  const pandal = searchParams.get("pandal");
  const href = pandal ? `/app?pandal=${pandal}` : "/app";

  const handleClick = useCallback(() => {
    setIsNavigating(true);
  }, []);

  // Fallback: if navigation takes too long (>8s), reset state so user can retry
  useEffect(() => {
    if (!isNavigating) return;
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isNavigating]);

  // ── Full-screen navigation overlay ──────────────────────────────────────
  if (isNavigating) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-6 animate-in fade-in duration-200">
        <h1
          className="text-5xl font-bold text-primary tracking-tight animate-pulse"
          style={{
            textShadow:
              "0 4px 15px rgba(0, 0, 0, 0.2), 0 0 2px rgba(0,0,0,0.8), -1px -1px 1px rgba(0,0,0,0.5), 1px 1px 1px rgba(0,0,0,0.5)",
          }}
        >
          <span className="font-calligraphy">Pujo</span>
          <span className="font-extrabold text-6xl">পথ</span>
        </h1>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading your pandal map...</span>
        </div>
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-[loading-bar_2s_ease-in-out_infinite]" />
        </div>
      </div>
    );
  }

  // ── Landing page ────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Prefetch /app JS bundle while user reads the landing page */}
      <Link href="/app" prefetch={true} className="sr-only" aria-hidden="true">Preload app</Link>

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

        {/* CTA — uses <a> tag for reliable navigation to force-dynamic route */}
        <a
          href={href}
          onClick={handleClick}
          className="flex items-center justify-center gap-3 w-full max-w-xs rounded-lg bg-primary text-primary-foreground font-bold text-lg py-4 px-6 transition-all duration-200 hover:bg-primary/90 active:scale-95 hover:shadow-lg hover:shadow-primary/25"
        >
          <MapPin className="w-5 h-5" />
          <span>Start Exploring</span>
          <ArrowRight className="w-5 h-5" />
        </a>
      </section>

      {/* ─── Social Proof ─── */}
      <section className="px-6 py-8">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-extrabold text-primary">{siteStats.explorers.value}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              {siteStats.explorers.label}
            </p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-primary">{siteStats.pandals.value}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              {siteStats.pandals.label}
            </p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-primary">{siteStats.instagramViews.value}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              {siteStats.instagramViews.label}
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
