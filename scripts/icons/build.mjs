import fs from 'node:fs';
import { chromium } from 'playwright';
import { svg } from './design.mjs';
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/favicon.svg`, svg());
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const shot = async (name, markup, size, transparent) => {
  const p = await (await b.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })).newPage();
  await p.setContent(`<html><body style="margin:0;background:transparent">${markup.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
  await p.screenshot({ path: `${out}/${name}`, omitBackground: transparent });
  await p.close();
};
await shot('icon-192.png', svg(), 192, true);
await shot('icon-512.png', svg(), 512, true);
await shot('apple-touch-icon.png', svg({ rx: 0 }), 180, false);            // iOS rounds the corners itself
await shot('icon-maskable-512.png', svg({ rx: 0, scale: 0.76 }), 512, false); // art inside the 80% safe zone
for (const s of [16, 32, 48]) await shot(`ico-${s}.png`, svg(), s, true);
await b.close();
