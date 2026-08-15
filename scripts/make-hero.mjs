import sharp from "sharp";
/*
 * Hero placeholder.
 *
 * Deliberately abstract. Stock photographs of models presented as a salon's
 * own work would misrepresent the business to its customers, so the slot ships
 * with a textural field the client replaces with their actual photography.
 * Palette drawn from the same oxidation sequence as the Patient Pigment plate.
 */
const W = 1600, H = 2000;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
 <defs>
  <linearGradient id="cloth" x1="0.1" y1="0" x2="0.9" y2="1">
    <stop offset="0%"  stop-color="#E7D3CB"/>
    <stop offset="38%" stop-color="#CDA79F"/>
    <stop offset="72%" stop-color="#9E6B6A"/>
    <stop offset="100%" stop-color="#6F3B3E"/>
  </linearGradient>
  <radialGradient id="light" cx="34%" cy="22%" r="70%">
    <stop offset="0%" stop-color="#FBF1E6" stop-opacity="0.62"/>
    <stop offset="100%" stop-color="#FBF1E6" stop-opacity="0"/>
  </radialGradient>
 </defs>
 <rect width="${W}" height="${H}" fill="url(#cloth)"/>
 ${Array.from({length: 26}, (_, i) => {
   const t = i / 25;
   const x = -200 + t * (W + 400);
   return `<path d="M${x} 0 C ${x + 180} ${H*0.32}, ${x - 140} ${H*0.68}, ${x + 90} ${H}"
     fill="none" stroke="#FBF1E6" stroke-width="${1 + (i % 4)}" opacity="${(0.05 + (i % 5) * 0.018).toFixed(3)}"/>`;
 }).join("")}
 <rect width="${W}" height="${H}" fill="url(#light)"/>
</svg>`;
await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile("clients/meher-salon/images/hero-01.jpg");
const m = await sharp("clients/meher-salon/images/hero-01.jpg").metadata();
console.log(`hero-01.jpg  ${m.width}x${m.height}`);
