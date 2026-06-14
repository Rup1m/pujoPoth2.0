"use client";

import { useEffect, useState } from "react";

/**
 * Festive confetti burst — pure CSS, zero dependencies.
 *
 * Renders 24 particles in saffron/gold/red/green Durga Puja colors
 * that burst outward from center and fade. Auto-unmounts after 1.6s.
 *
 * Usage:
 *   {showConfetti && <ConfettiBurst onComplete={() => setShowConfetti(false)} />}
 */

const PARTICLE_COUNT = 24;

// Festive Durga Puja palette
const COLORS = [
  "#f59e0b", // saffron gold
  "#ef4444", // sindoor red
  "#f97316", // deep orange
  "#eab308", // bright gold
  "#22c55e", // leaf green
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#06b6d4", // cyan
];

interface Particle {
  id: number;
  color: string;
  angle: number; // direction in degrees
  distance: number; // how far it travels (px)
  size: number;
  delay: number;
  duration: number;
  shape: "circle" | "square" | "triangle";
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    angle: (360 / PARTICLE_COUNT) * i + (Math.random() * 30 - 15),
    distance: 40 + Math.random() * 70,
    size: 4 + Math.random() * 5,
    delay: Math.random() * 0.15,
    duration: 0.8 + Math.random() * 0.6,
    shape: (["circle", "square", "triangle"] as const)[Math.floor(Math.random() * 3)],
  }));
}

export function ConfettiBurst({ onComplete }: { onComplete?: () => void }) {
  const [particles] = useState(generateParticles);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
      aria-hidden="true"
    >
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.distance;
        const ty = Math.sin(rad) * p.distance;

        return (
          <span
            key={p.id}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.shape === "circle" ? "50%" : p.shape === "square" ? "2px" : "0",
              clipPath: p.shape === "triangle" ? "polygon(50% 0%, 0% 100%, 100% 100%)" : undefined,
              animation: `confetti-burst ${p.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}s forwards`,
              // Use CSS custom properties for the translate
              ["--tx" as string]: `${tx}px`,
              ["--ty" as string]: `${ty}px`,
              transform: "translate(0, 0) scale(0)",
            }}
          />
        );
      })}

      {/* Override animation to use the custom translate values */}
      <style jsx>{`
        @keyframes confetti-burst {
          0% {
            transform: translate(0, 0) scale(0) rotate(0deg);
            opacity: 1;
          }
          20% {
            transform: translate(0, 0) scale(1.2) rotate(90deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) scale(0.3) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
