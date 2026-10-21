import { chromium } from '/tmp/claude-0/-home-user-forge/37f6e308-b73d-5c57-8086-11f40991c3d3/scratchpad/harness/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
export async function toPng(diagram, out) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: diagram.w, height: diagram.h }, deviceScaleFactor: 2 })).newPage();
  await p.setContent(`<html><body style="margin:0">${diagram.svg()}</body></html>`);
  await p.screenshot({ path: out });
  await b.close();
}
