/**
 * Meta Pixel (Facebook Pixel) utility
 * Provides typed helpers for all standard Meta Pixel events.
 *
 * Usage:
 *   import * as fbPixel from '@/lib/fbPixel';
 *   fbPixel.viewContent({ content_name: 'Campaign Title', value: 100000, currency: 'IDR' });
 */

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

// ---------------------------------------------------------------------------
// Core — retry queue for when fbq is not yet initialized
// ---------------------------------------------------------------------------

const MAX_RETRIES = 20; // 20 x 250ms = 5 seconds max wait
const RETRY_INTERVAL = 250;

export function pageView() {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView');
  }
}

function track(event: string, params?: Record<string, any>, attempt = 0) {
  if (typeof window === 'undefined') return;

  if (window.fbq) {
    console.log('[fbPixel] track:', event, params);
    window.fbq('track', event, params);
  } else if (attempt < MAX_RETRIES) {
    // fbq not ready yet — retry after short delay
    setTimeout(() => track(event, params, attempt + 1), RETRY_INTERVAL);
  } else {
    console.warn('[fbPixel] fbq not available after retries, skipping:', event);
  }
}

// ---------------------------------------------------------------------------
// Standard Events
// ---------------------------------------------------------------------------

/** User views a product/content page (e.g. program detail) */
export function viewContent(params: {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
}) {
  track('ViewContent', { currency: 'IDR', ...params });
}

/** User adds item to cart (e.g. donation amount selected → confirm modal) */
export function addToCart(params: {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
}) {
  track('AddToCart', { currency: 'IDR', ...params });
}

/** User adds item to wishlist / favorites */
export function addToWishlist(params?: {
  content_name?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
}) {
  track('AddToWishlist', { currency: 'IDR', ...params });
}

/** User initiates checkout */
export function initiateCheckout(params?: {
  content_ids?: string[];
  num_items?: number;
  value?: number;
  currency?: string;
}) {
  track('InitiateCheckout', { currency: 'IDR', ...params });
}

/** User adds payment info (selects payment method) */
export function addPaymentInfo(params?: {
  content_ids?: string[];
  value?: number;
  currency?: string;
}) {
  track('AddPaymentInfo', { currency: 'IDR', ...params });
}

/** Purchase completed */
export function purchase(params: {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
  value: number;
  currency?: string;
}) {
  track('Purchase', { currency: 'IDR', ...params });
}

/** Lead generated (e.g. contact form, inquiry) */
export function lead(params?: {
  content_name?: string;
  value?: number;
  currency?: string;
}) {
  track('Lead', params);
}

/** User completes registration */
export function completeRegistration(params?: {
  content_name?: string;
  value?: number;
  currency?: string;
  status?: string;
}) {
  track('CompleteRegistration', params);
}

/** User clicks contact (e.g. WhatsApp button) */
export function contact(params?: {
  content_name?: string;
}) {
  track('Contact', params);
}

/** User performs a search */
export function search(params?: {
  search_string?: string;
  content_category?: string;
}) {
  track('Search', params);
}
