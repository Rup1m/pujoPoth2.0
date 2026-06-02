/**
 * @fileoverview Centralized configuration for site-wide constants.
 *
 * Social proof numbers and marketing stats live here so they can be
 * updated in one place instead of hunting through JSX.
 *
 * To update: edit the values below and redeploy.
 * These are intentionally not fetched from Firestore because the
 * landing page is a client component and should render instantly
 * without waiting for a network round-trip.
 */

export const siteStats = {
  /** Total unique users from the previous Puja season */
  explorers: { value: '1,080+', label: 'Puja explorers last season' },

  /** Total pandals & bonedi bari pujos indexed in the app (excluding metro stations) */
  pandals: { value: '95+', label: 'Pandals & Bonedi Bari Pujos' },

  /** Instagram video views for the PujoPoth campaign */
  instagramViews: { value: '70K', label: 'Instagram video views' },
} as const;
