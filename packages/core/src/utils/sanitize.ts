const ALLOWED_TAGS = new Set(['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'span']);

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<(\/?)([\w]+)([^>]*)>/g, (_match, slash, tag) => {
      const t = tag.toLowerCase();
      return ALLOWED_TAGS.has(t) ? `<${slash}${t}>` : '';
    });
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}
