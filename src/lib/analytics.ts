/**
 * @fileoverview analytics.ts — Lightweight, type-safe Google Analytics event helper.
 *
 * Usage:
 *   import { trackEvent } from '@/lib/analytics';
 *   trackEvent('pandal_clicked', { pandal_name: 'Bagbazar', zone: 'North' });
 *
 * This module is purely additive — importing it in a component that doesn't
 * call `trackEvent()` adds zero runtime overhead (tree-shaken away).
 *
 * All event names are typed to prevent typos and enforce consistent naming.
 */

/** Exhaustive list of custom events tracked by the app. */
export type AnalyticsEvent =
  | 'pandal_clicked'
  | 'search_performed'
  | 'filter_applied'
  | 'filter_cleared'
  | 'directions_requested'
  | 'language_switched'
  | 'auth_success'
  | 'auth_failed'
  | 'auth_popup_blocked_fallback'
  | 'auth_sign_out'
  // Gamification events
  | 'pandal_visited'
  | 'pandal_unvisited'
  | 'achievement_unlocked'
  | 'account_panel_opened';

/**
 * Fire a GA4 custom event. Safely no-ops when:
 *  - `window` is undefined (SSR)
 *  - `gtag` is not loaded (GA ID missing)
 *
 * @param event — One of the pre-defined event names
 * @param params — Arbitrary key-value pairs sent as event parameters
 */
export function trackEvent(
  event: AnalyticsEvent,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return;

  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (!gtag) return;

  gtag('event', event, params);
}
