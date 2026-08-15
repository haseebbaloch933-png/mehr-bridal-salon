/**
 * WhatsApp is the checkout.
 *
 * 75% of Pakistani orders are cash on delivery and bank-account penetration is
 * around 28%, so a payment gateway would serve a small minority and cost the
 * client a monthly fee. Every buying action on these sites instead opens a
 * WhatsApp chat with the message already written — the customer only presses
 * send. That single detail is the difference between a brochure and a shop.
 */

import { intlPhone } from './format';

export type MessageLine = [label: string, value: string | number | undefined];

/**
 * Builds a wa.me deep link with a pre-filled message.
 *
 * Note the double encoding trap: wa.me expects the `text` param percent-encoded
 * once. encodeURIComponent on the assembled string is correct; running it over
 * an already-encoded string produces %2520 and the customer sees literal escape
 * codes in their chat box.
 */
export function waLink(phone: string, message: string): string {
  return `https://wa.me/${intlPhone(phone)}?text=${encodeURIComponent(message)}`;
}

/** Greeting used on every message. Urdu-English mix, as people actually write. */
const SALAM = 'Assalam o alaikum!';

/**
 * A general enquiry — the sticky bar and hero button.
 */
export function enquiryMessage(businessName: string): string {
  return `${SALAM} I found ${businessName} online and wanted to ask about your services.`;
}

/**
 * Enquiry about one package, with the name and price already stated so the
 * owner does not have to ask "which one?" — that round trip is where these
 * conversations die.
 */
export function packageMessage(
  businessName: string,
  packageName: string,
  priceLabel: string
): string {
  return [
    SALAM,
    ``,
    `I want to ask about this at ${businessName}:`,
    ``,
    `${packageName} — PKR ${priceLabel}`,
  ].join('\n');
}

/**
 * A single line item from the price menu.
 */
export function menuItemMessage(
  businessName: string,
  itemName: string,
  priceLabel: string
): string {
  return [
    SALAM,
    ``,
    `I would like to book this at ${businessName}:`,
    ``,
    `${itemName} — PKR ${priceLabel}`,
  ].join('\n');
}

/**
 * The booking form. Built client-side from the filled fields, so this shape is
 * duplicated in the inline script — keep the two in step.
 */
export function bookingMessage(businessName: string, lines: MessageLine[]): string {
  const body = lines
    .filter(([, v]) => v !== undefined && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  return [SALAM, ``, `I would like to book an appointment at ${businessName}.`, ``, body].join('\n');
}
