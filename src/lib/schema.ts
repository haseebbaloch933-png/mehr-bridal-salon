/**
 * The content contract.
 *
 * One JSON file per client drives an entire site. Nothing else is edited to
 * launch a new business — that is the whole economic argument for the engine:
 * the first site costs ~37 hours, every one after costs a content pass.
 *
 * Rules that hold across every trade:
 *  - Prices are integers in PKR. Never strings, never decimals. Rupees have no
 *    subunit in practice and "45,000" as a string cannot be validated or summed.
 *  - Phone numbers are stored exactly as the owner says them ("0332 2440314").
 *    Normalisation to +92 happens in format.ts at render time, once.
 *  - Every section is optional. A tailor has no bridal packages; a dental clinic
 *    has no timetable. Absent key means the section does not render at all.
 */

/**
 * `salon` is the light warm-atelier look, matched to how premium beauty
 * actually presents in 2026. `salon-organic` restates the same page in an
 * imported Claude Design system. `salon-noir` is dark plum-and-gold, for a
 * jewellery-adjacent or menswear grooming brand. `salon-crimson` is deep
 * wine-and-gold — the explicitly "Pakistani bridal" direction, where red is
 * measured as fill-only (never text, every red failed 4.5:1 as ink on that
 * ground) and gold carries every heading and price. Kept alongside the
 * others rather than replacing them, same reasoning as noir: options close.
 */
export type Skin =
  | 'salon'
  | 'salon-organic'
  | 'salon-noir'
  | 'salon-crimson'
  | 'dental'
  | 'gym'
  | 'bakery'
  | 'tailor';

/** Shown as an Urdu subtitle under English headings. Optional everywhere. */
export type Bilingual = {
  en: string;
  ur?: string;
};

export type Business = {
  /** Trading name as it appears on the shopfront. */
  name: string;
  /** One line, under ~50 chars. Appears under the wordmark. */
  tagline: string;
  /** Which visual skin to render. */
  skin: Skin;
  /** Year founded — "Est. 2016". Omit if unknown; never invent one. */
  established?: number;
  /** Optional Urdu rendering of the trading name. */
  nameUrdu?: string;
  /**
   * Filename in clients/<id>/images/ for the hero photograph.
   *
   * Beauty is a visual trade — one good photograph of real work sells harder
   * than any amount of copy. Omit it and the hero falls back to a typographic
   * treatment, which is the correct state while waiting on a client's photos
   * rather than a broken one.
   */
  heroImage?: string;
  heroAlt?: string;
};

export type Contact = {
  /** Orders and bookings land here. Local format, e.g. "0332 2440314". */
  whatsapp: string;
  /** Landline or mobile for tap-to-call. Defaults to whatsapp if omitted. */
  phone?: string;
  email?: string;
};

export type OpeningHours = {
  /** "Mon – Sat" or "Sunday". Free text: real shops keep irregular hours. */
  days: string;
  /** "11:00am – 9:00pm", or "Closed". */
  hours: string;
};

export type Location = {
  /** "Soan Gardens" — the neighbourhood a customer would say out loud. */
  area: string;
  city: string;
  /** Street-level line. Include the landmark: that is how people navigate here. */
  addressLine: string;
  /** What to put in a Google Maps query. Falls back to addressLine + city. */
  mapQuery?: string;
  hours: OpeningHours[];
  /** Free-text note: "Closed Mondays", "Ladies only". */
  note?: string;
};

export type Rating = {
  /** e.g. 4.8 */
  score: number;
  /** Review count from the Google listing. */
  count: number;
  /** Always "Google" for now — shown as provenance so the number is credible. */
  source?: string;
};

/** A headline offering: bridal package, membership plan, treatment bundle. */
export type Package = {
  name: string;
  nameUrdu?: string;
  /** PKR, integer. */
  price: number;
  /** "per person", "per month", "onwards". Rendered small after the figure. */
  unit?: string;
  /** Bullet list of what is included. */
  items: string[];
  /** Draws the highlighted border and ribbon. At most one per site. */
  featured?: boolean;
  /** Ribbon text on the featured card, e.g. "Most booked". */
  ribbon?: string;
};

export type MenuItem = {
  name: string;
  /** Small grey line under the name: "90 minutes", "shoulder length". */
  note?: string;
  /** PKR, integer. */
  price: number;
  /** Renders "from 3,500" instead of "3,500". */
  from?: boolean;
};

export type MenuGroup = {
  heading: string;
  headingUrdu?: string;
  items: MenuItem[];
};

/** Gym timetable. Only used by the gym skin. */
export type ClassSlot = {
  day: string;
  time: string;
  name: string;
  coach?: string;
};

export type Booking = {
  enabled: boolean;
  /** Dropdown options. Usually mirrors package names plus common services. */
  serviceOptions: string[];
  /** Whether to ask for a date. Off for walk-in trades. */
  askDate?: boolean;
  /** Overrides the default heading. */
  heading?: string;
  /** Google Apps Script web-app URL. When set, bookings are logged to a Sheet. */
  sheetUrl?: string;
};

export type GalleryTile = {
  label: string;
  /** Path under /public, or omitted to render a coloured placeholder tile. */
  image?: string;
  alt?: string;
};

export type Review = {
  quote: string;
  author: string;
  /** "Married Jan 2026", "Member since 2023". */
  meta?: string;
};

export type Seo = {
  title: string;
  description: string;
};

export type ClientSite = {
  /** Slug. Must match the filename: clients/<id>.json */
  id: string;
  business: Business;
  contact: Contact;
  location: Location;
  rating?: Rating;
  /** Short reassurance chips under the hero: "Home service", "Ladies only". */
  trust?: string[];
  packages?: Package[];
  packagesHeading?: Bilingual;
  menu?: MenuGroup[];
  menuHeading?: Bilingual;
  timetable?: ClassSlot[];
  booking?: Booking;
  gallery?: GalleryTile[];
  reviews?: Review[];
  seo: Seo;
};

/* ------------------------------------------------------------------ *
 * Validation
 *
 * Deliberately hand-rolled rather than Zod: the engine ships zero runtime
 * dependencies to the browser, and adding a validation library to save
 * forty lines here would be the first crack in that.
 * ------------------------------------------------------------------ */

export class ContentError extends Error {}

const SKINS: Skin[] = [
  'salon',
  'salon-organic',
  'salon-noir',
  'salon-crimson',
  'dental',
  'gym',
  'bakery',
  'tailor',
];

function req(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new ContentError(msg);
}

function isPkr(n: unknown, where: string): asserts n is number {
  req(typeof n === 'number' && Number.isFinite(n), `${where}: price must be a number`);
  req(Number.isInteger(n), `${where}: price must be a whole number of rupees, got ${n}`);
  req(n > 0, `${where}: price must be positive, got ${n}`);
}

/**
 * Validates a client file and returns it typed. Throws on the first problem
 * with a message naming the exact field, because these files are edited by
 * hand under time pressure and a vague error costs more than the bug.
 */
export function validateClient(raw: unknown): ClientSite {
  req(raw && typeof raw === 'object', 'client file must be a JSON object');
  const c = raw as ClientSite;

  req(typeof c.id === 'string' && c.id.length > 0, 'id is required');

  req(c.business && typeof c.business === 'object', 'business block is required');
  req(!!c.business.name, 'business.name is required');
  req(!!c.business.tagline, 'business.tagline is required');
  req(
    SKINS.includes(c.business.skin),
    `business.skin must be one of ${SKINS.join(', ')} — got "${c.business.skin}"`
  );

  req(c.contact && !!c.contact.whatsapp, 'contact.whatsapp is required — it is the checkout');

  req(c.location && typeof c.location === 'object', 'location block is required');
  req(!!c.location.area, 'location.area is required');
  req(!!c.location.city, 'location.city is required');
  req(!!c.location.addressLine, 'location.addressLine is required');
  req(
    Array.isArray(c.location.hours) && c.location.hours.length > 0,
    'location.hours needs at least one entry — "when are you open" is the most-asked question'
  );

  if (c.rating) {
    req(
      typeof c.rating.score === 'number' && c.rating.score >= 0 && c.rating.score <= 5,
      'rating.score must be between 0 and 5'
    );
    req(
      Number.isInteger(c.rating.count) && c.rating.count >= 0,
      'rating.count must be a whole number'
    );
  }

  if (c.packages) {
    req(Array.isArray(c.packages), 'packages must be an array');
    let featured = 0;
    c.packages.forEach((p, i) => {
      req(!!p.name, `packages[${i}].name is required`);
      isPkr(p.price, `packages[${i}]`);
      req(
        Array.isArray(p.items) && p.items.length > 0,
        `packages[${i}].items needs at least one line — an empty package reads as unfinished`
      );
      if (p.featured) featured++;
    });
    req(featured <= 1, 'at most one package may be featured — two highlights means no highlight');
  }

  if (c.menu) {
    req(Array.isArray(c.menu), 'menu must be an array of groups');
    c.menu.forEach((g, i) => {
      req(!!g.heading, `menu[${i}].heading is required`);
      req(Array.isArray(g.items) && g.items.length > 0, `menu[${i}].items is empty`);
      g.items.forEach((it, j) => {
        req(!!it.name, `menu[${i}].items[${j}].name is required`);
        isPkr(it.price, `menu[${i}].items[${j}]`);
      });
    });
  }

  if (c.booking?.enabled) {
    req(
      Array.isArray(c.booking.serviceOptions) && c.booking.serviceOptions.length > 0,
      'booking.serviceOptions is required when booking is enabled'
    );
  }

  req(c.seo && !!c.seo.title, 'seo.title is required');
  req(!!c.seo.description, 'seo.description is required');

  return c;
}
