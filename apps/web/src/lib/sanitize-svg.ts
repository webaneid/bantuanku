/**
 * Strip XSS vectors from admin-provided SVG strings before innerHTML injection.
 * Removes: <script> blocks, on* event handlers, javascript: URLs.
 * Does NOT parse/validate the SVG — only removes known dangerous patterns.
 */
export function sanitizeSvg(svg: string): string {
  return svg
    // Remove <script>...</script> blocks (case-insensitive, multiline)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    // Remove on* event handler attributes (onclick, onload, onerror, etc.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Remove javascript: URLs in href / xlink:href / action
    .replace(/(href|xlink:href|action|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '')
    // Remove <iframe>, <object>, <embed> tags
    .replace(/<(iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
}
