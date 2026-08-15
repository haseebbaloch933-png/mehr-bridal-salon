/**
 * Scaffolds a new client file from a skin template.
 *
 *   node scripts/new-client.mjs iqra-salon salon
 *
 * The point of the engine is that this — plus a content pass — is the entire
 * cost of a new site. If you ever find yourself editing components to onboard
 * a client, the schema is missing a field; add it there instead.
 */

import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const [, , id, skin = 'salon'] = process.argv;

if (!id) {
  console.error('usage: node scripts/new-client.mjs <client-id> [salon|dental|gym|bakery|tailor]');
  process.exit(1);
}

const VALID = ['salon', 'dental', 'gym', 'bakery', 'tailor'];
if (!VALID.includes(skin)) {
  console.error(`skin must be one of: ${VALID.join(', ')}`);
  process.exit(1);
}

const path = join('clients', `${id}.json`);

try {
  await access(path);
  console.error(`✗ ${path} already exists — refusing to overwrite`);
  process.exit(1);
} catch {
  /* good, it does not exist */
}

const template = {
  id,
  business: {
    name: 'TODO business name',
    tagline: 'TODO one line, under 50 characters',
    skin,
    established: null,
  },
  contact: {
    whatsapp: 'TODO 03XX XXXXXXX',
    phone: '',
  },
  location: {
    area: 'TODO neighbourhood',
    city: 'Islamabad',
    addressLine: 'TODO street and landmark',
    mapQuery: '',
    hours: [{ days: 'Mon – Sat', hours: '11:00am – 9:00pm' }],
    note: '',
  },
  rating: { score: 0, count: 0, source: 'Google' },
  trust: [],
  packages: [],
  menu: [],
  booking: { enabled: true, askDate: true, serviceOptions: [] },
  gallery: [],
  reviews: [],
  seo: {
    title: 'TODO Business — Area, Islamabad',
    description: 'TODO one sentence with the trade, the area and the word Islamabad.',
  },
};

await writeFile(path, JSON.stringify(template, null, 2) + '\n', 'utf8');

console.log(`\n✓ created ${path}\n`);
console.log('  Next:');
console.log(`    1. Fill in every TODO — the build will reject missing fields`);
console.log(`    2. CLIENT=${id} npm run dev`);
console.log(`    3. CLIENT=${id} npm run build\n`);
console.log('  Before you ask the client for anything: fill it with their Google');
console.log('  photos and review text first. People edit far more readily than');
console.log('  they supply.\n');
