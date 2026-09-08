import type { FeaturedVendorStyle, Vendor, VendorFeatured } from '../types';

export type FeaturedVisualStyle = {
  badgeBackground: string;
  badgeBorder: string;
  badgeText: string;
  glow: string;
  ringOuter: string;
  ringInner: string;
};

export const featuredVisualStyles: Record<FeaturedVendorStyle, FeaturedVisualStyle> = {
  gold: {
    badgeBackground: 'rgba(245, 178, 44, 0.16)',
    badgeBorder: 'rgba(245, 178, 44, 0.42)',
    badgeText: '#FFE3A1',
    glow: 'rgba(245, 178, 44, 0.24)',
    ringOuter: '#F5B22C',
    ringInner: '#FFF0B8',
  },
  neon: {
    badgeBackground: 'rgba(107, 92, 255, 0.18)',
    badgeBorder: 'rgba(129, 119, 255, 0.46)',
    badgeText: '#D8D3FF',
    glow: 'rgba(107, 92, 255, 0.28)',
    ringOuter: '#6B5CFF',
    ringInner: '#22D3EE',
  },
  royal: {
    badgeBackground: 'rgba(255, 255, 255, 0.12)',
    badgeBorder: 'rgba(255, 255, 255, 0.36)',
    badgeText: '#FFFFFF',
    glow: 'rgba(255, 255, 255, 0.18)',
    ringOuter: '#FFFFFF',
    ringInner: '#B9C4FF',
  },
  rose: {
    badgeBackground: 'rgba(242, 83, 112, 0.17)',
    badgeBorder: 'rgba(242, 83, 112, 0.46)',
    badgeText: '#FFD3DD',
    glow: 'rgba(242, 83, 112, 0.24)',
    ringOuter: '#F25370',
    ringInner: '#F5B22C',
  },
};

export function getFeaturedVisualStyle(featured?: VendorFeatured): FeaturedVisualStyle | null {
  if (!featured?.enabled) return null;
  return featuredVisualStyles[featured.style] ?? featuredVisualStyles.gold;
}

export function getVendorFeaturedPriority(vendor: Vendor) {
  return vendor.featured?.enabled ? vendor.featured.priority : 0;
}

export function sortFeaturedFirst(vendors: Vendor[]) {
  return [...vendors].sort((a, b) => {
    const priorityDelta = getVendorFeaturedPriority(b) - getVendorFeaturedPriority(a);
    if (priorityDelta !== 0) return priorityDelta;

    const ratingDelta = b.rating - a.rating;
    if (ratingDelta !== 0) return ratingDelta;

    return b.reviewCount - a.reviewCount;
  });
}
