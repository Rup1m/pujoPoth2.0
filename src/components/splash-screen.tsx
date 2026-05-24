
"use client";

import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  /** Called when the minimum animation duration has elapsed.
   *  The parent uses this signal (combined with data-readiness)
   *  to decide when to dismiss the splash. */
  onAnimationComplete?: () => void;
}

/** Minimum time the splash is shown so the brand animation completes. */
const MIN_ANIMATION_MS = 1200;

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const [animDone, setAnimDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimDone(true);
      onAnimationComplete?.();
    }, MIN_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-background overflow-hidden relative">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="inline-block">
            <h1 
            className="text-6xl font-bold text-primary tracking-tight overflow-hidden whitespace-nowrap animate-smooth-reveal px-2 pb-2"
            style={{
                textShadow: '0 4px 15px rgba(0, 0, 0, 0.2), 0 0 2px rgba(0,0,0,0.8), -1px -1px 1px rgba(0,0,0,0.5), 1px 1px 1px rgba(0,0,0,0.5)',
            }}
            >
             <span className="font-calligraphy">Pujo</span><span className="font-extrabold text-7xl">পথ</span>
            </h1>
        </div>
        <div className="w-64 h-8 mt-2">
            <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="w-full h-full">
                <path 
                    d="M 0 10 Q 50 20, 100 10 T 200 10" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="3" 
                    fill="none" 
                    strokeLinecap="round"
                    strokeDasharray="10 10"
                    className="animate-road-flow"
                />
            </svg>
        </div>
      </div>
      <div className="absolute bottom-6 text-center text-muted-foreground animate-fade-in [animation-delay:1s] [animation-fill-mode:backwards]">
          <p className="text-sm font-semibold">A Rupam Banerjee Production</p>
          <p className="text-xs">rupamiem@gmail.com</p>
      </div>
    </div>
  );
}
