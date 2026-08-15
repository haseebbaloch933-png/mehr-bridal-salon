import sharp from "sharp";
import { mkdir } from "node:fs/promises";
// Phone-camera sized so the pipeline is genuinely exercised, not faked with thumbnails.
const W = 3024, H = 4032;
const tiles = [
  ["barat-01.jpg",   "#4A3348"],
  ["mehndi-01.jpg",  "#4B3A2A"],
  ["walima-01.jpg",  "#3B3350"],
  ["engagement-01.jpg", "#523641"],
];
await mkdir("clients/meher-salon/images", { recursive: true });
for (const [name, hex] of tiles) {
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0%" stop-color="${hex}"/><stop offset="100%" stop-color="#20161F"/>
       </linearGradient></defs>
       <rect width="${W}" height="${H}" fill="url(#g)"/>
       <circle cx="${W*0.5}" cy="${H*0.34}" r="${W*0.22}" fill="#D4A857" opacity="0.30"/>
       <circle cx="${W*0.30}" cy="${H*0.62}" r="${W*0.13}" fill="#EBD3A0" opacity="0.16"/>
     </svg>`
  );
  const out = `clients/meher-salon/images/${name}`;
  await sharp(svg).jpeg({ quality: 92 }).toFile(out);
  const m = await sharp(out).metadata();
  console.log(`${name.padEnd(20)} ${m.width}x${m.height}  ${(m.size/1024/1024).toFixed(2)} MB`);
}
