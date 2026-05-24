
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function haversineDistance(
  coords1: { lat: number; lng: number },
  coords2: { lat: number; lng: number }
) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lng - coords1.lng);
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateWalkingTime(distance: number): string {
    const walkingSpeedKmh = 5;
    const timeHours = distance / walkingSpeedKmh;
    const timeMinutes = Math.round(timeHours * 60);

    if (timeMinutes < 1) {
        return "< 1 min walk";
    }
    if (timeMinutes < 60) {
        return `${timeMinutes} min walk`;
    } else {
        const hours = Math.floor(timeMinutes / 60);
        const minutes = timeMinutes % 60;
        return `${hours}h ${minutes}m walk`;
    }
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const distanceM = Math.round(distanceKm * 1000);
    return `${distanceM} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}
