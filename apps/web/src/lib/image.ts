/**
 * Image URL helper functions
 * Handles both CDN URLs and local paths
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

/**
 * Generate inline SVG placeholder
 * Returns data URI with simple gray background and image icon
 */
function generatePlaceholderSVG(): string {
  const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#e5e7eb"/><g transform="translate(400, 300)"><rect x="-60" y="-50" width="120" height="100" rx="8" fill="#9ca3af" opacity="0.5"/><circle cx="0" cy="-20" r="15" fill="#6b7280"/><path d="M -40 10 L -20 -10 L 0 10 L 20 -10 L 40 10 L 40 30 L -40 30 Z" fill="#6b7280"/></g></svg>`;

  // Use encodeURIComponent for browser compatibility (no Buffer needed)
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Convert image path/URL to full URL
 * - If already absolute URL (http/https), return as-is
 * - If relative path, prepend API base URL
 * - If empty, return placeholder
 */
export function getImageUrl(imageUrl: string | null | undefined, fallback?: string): string {
  if (!imageUrl) {
    return fallback || generatePlaceholderSVG();
  }

  // Detect placehold.co and replace with local placeholder
  if (imageUrl.includes('placehold.co')) {
    return fallback || generatePlaceholderSVG();
  }

  // Already absolute URL (GCS CDN or external)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Relative path - prepend API base URL
  const baseUrl = API_URL.replace('/v1', ''); // Remove /v1 suffix
  return `${baseUrl}${imageUrl}`;
}

/**
 * Get placeholder image for specific type
 */
export function getPlaceholderImage(type?: 'campaign' | 'zakat' | 'qurban' | 'profile'): string {
  // All types use the same inline SVG placeholder for now
  return generatePlaceholderSVG();
}
