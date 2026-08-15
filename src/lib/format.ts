/**
 * Formatting helpers. All render-time, all pure, none shipped to the browser.
 */

/**
 * Pakistani digit grouping: 1,25,000 — not 125,000.
 *
 * South Asian numbering groups the last three digits, then twos. Getting this
 * wrong is immediately visible to a local reader and makes the whole page look
 * foreign, which is the opposite of what these businesses are paying for.
 */
export function pkr(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

/**
 * Local display format, unchanged from how the owner writes it.
 * "03322440314" -> "0332 2440314"
 */
export function displayPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) return `${d.slice(0, 4)} ${d.slice(4)}`;
  if (d.length === 10 && d.startsWith('51')) return `051 ${d.slice(2)}`;
  return raw.trim();
}

/**
 * E.164 without the plus, for wa.me and tel: links.
 * Accepts "0332 2440314", "+92 332 2440314", "923322440314".
 */
export function intlPhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('92')) return d;
  if (d.startsWith('0')) return '92' + d.slice(1);
  return '92' + d;
}

export function telHref(raw: string): string {
  return `tel:+${intlPhone(raw)}`;
}

export function mapsHref(query: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

/** Trims and collapses whitespace so hand-edited JSON does not leak formatting. */
export function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
